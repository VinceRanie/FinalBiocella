const Batch = require("../models/batchModel");
const QRCode = require("qrcode");
const USED_QUANTITY_ROUNDING_TOLERANCE = 0.2;

const normalizeDecimal = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  return NaN;
};

// CREATE
exports.create = async (req, res) => {
  try {
    console.log('Batch create request received:', req.body);
    
    // Convert ISO date string to YYYY-MM-DD format for MySQL DATE column
    let data = { ...req.body };
    if (data.expiration_date) {
      const dateObj = new Date(data.expiration_date);
      data.expiration_date = dateObj.toISOString().split('T')[0]; // Extract YYYY-MM-DD
      console.log('Converted expiration_date to:', data.expiration_date);
    }
    
    if (typeof data.lot_number === 'string') {
      data.lot_number = data.lot_number.trim();
    }

    if (!data.lot_number) {
      return res.status(400).json({ error: "lot_number is required for batch tracking" });
    }

    const quantity = normalizeDecimal(data.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      return res.status(400).json({ error: "Invalid quantity" });
    }
    data.quantity = quantity;

    // First create the batch to get the ID
    const tempData = {
      ...data,
      qr_code: null
    };
    const batchId = await Batch.createBatch(tempData);
    console.log('Batch created with ID:', batchId);
    
    // Generate QR code with role-resolved scan URL.
    const baseUrl = (process.env.FRONTEND_URL || 'https://testbiocella.dcism.org').replace(/\/+$/, '');
    const qrUrl = `${baseUrl}/scan/batch/${batchId}`;
    const qrCodeDataURL = await QRCode.toDataURL(qrUrl);
    
    // Update the batch with the QR code
    await Batch.updateBatch(batchId, {
      ...data,
      qr_code: qrCodeDataURL
    });
    console.log('QR code added to batch:', batchId);
    
    res.status(201).json({ 
      message: "Batch created", 
      batch_id: batchId,
      qr_code: qrCodeDataURL
    });
  } catch (err) {
    console.error('Error creating batch:', err);
    res.status(500).json({ error: err.message });
  }
};

// READ ALL
exports.getAll = async (req, res) => {
  try {
    const filters = {
      chemical_id: req.query.chemical_id,
      lot_number: req.query.lot_number,
    };
    const batches = await Batch.getAllBatches(filters);
    res.json(batches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ ONE
exports.getById = async (req, res) => {
  try {
    const batch = await Batch.getBatchById(req.params.id);
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    res.json(batch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ GUIDANCE FOR USAGE ORDERING
// Prefer already-opened containers first, then FEFO (earliest expiration), then oldest received.
exports.getUsageGuidance = async (req, res) => {
  try {
    const currentBatch = await Batch.getBatchById(req.params.id);
    if (!currentBatch) return res.status(404).json({ message: "Batch not found" });

    const chemicalBatches = await Batch.getAllBatches({ chemical_id: currentBatch.chemical_id });

    const withRemaining = chemicalBatches
      .map((batch) => {
        const quantity = Number(batch.quantity) || 0;
        const used = Number(batch.used_quantity) || 0;
        const remaining = Math.max(0, quantity - used);
        return {
          ...batch,
          quantity,
          used_quantity: used,
          remaining,
        };
      })
      .filter((batch) => batch.remaining > 0);

    const sortByOperationalOrder = (a, b) => {
      const aOpened = a.used_quantity > 0 ? 1 : 0;
      const bOpened = b.used_quantity > 0 ? 1 : 0;
      if (aOpened !== bOpened) return bOpened - aOpened;

      const aExp = a.expiration_date ? new Date(a.expiration_date).getTime() : Number.POSITIVE_INFINITY;
      const bExp = b.expiration_date ? new Date(b.expiration_date).getTime() : Number.POSITIVE_INFINITY;
      if (aExp !== bExp) return aExp - bExp;

      const aReceived = a.date_received ? new Date(a.date_received).getTime() : Number.POSITIVE_INFINITY;
      const bReceived = b.date_received ? new Date(b.date_received).getTime() : Number.POSITIVE_INFINITY;
      if (aReceived !== bReceived) return aReceived - bReceived;

      return Number(a.batch_id) - Number(b.batch_id);
    };

    const ordered = withRemaining.sort(sortByOperationalOrder);
    const preferred = ordered[0] || null;
    const shouldWarn = Boolean(preferred && Number(preferred.batch_id) !== Number(currentBatch.batch_id));

    return res.json({
      current_batch_id: Number(currentBatch.batch_id),
      chemical_id: Number(currentBatch.chemical_id),
      preferred_batch_id: preferred ? Number(preferred.batch_id) : null,
      should_warn: shouldWarn,
      message: shouldWarn
        ? `Recommended to use batch #${preferred.batch_id} first to avoid opening untouched containers.`
        : "This is the recommended batch to consume now.",
      preferred_batch: preferred
        ? {
            batch_id: Number(preferred.batch_id),
            lot_number: preferred.lot_number || null,
            remaining: Number(preferred.remaining),
            unit: preferred.chemical_unit || null,
            expiration_date: preferred.expiration_date || null,
            location: preferred.location || null,
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
exports.update = async (req, res) => {
  try {
    console.log('Batch update request received:', { id: req.params.id, data: req.body });
    
    // Convert ISO date string to YYYY-MM-DD format for MySQL DATE column
    let data = { ...req.body };
    if (data.expiration_date) {
      const dateObj = new Date(data.expiration_date);
      data.expiration_date = dateObj.toISOString().split('T')[0]; // Extract YYYY-MM-DD
      console.log('Converted expiration_date to:', data.expiration_date);
    }
    
    if (typeof data.lot_number === 'string') {
      data.lot_number = data.lot_number.trim();
    }

    const quantity = normalizeDecimal(data.quantity);
    const usedQuantity = normalizeDecimal(data.used_quantity);

    if (!Number.isFinite(quantity) || quantity < 0) {
      return res.status(400).json({ error: "Invalid quantity" });
    }

    if (!Number.isFinite(usedQuantity) || usedQuantity < 0) {
      return res.status(400).json({ error: "Invalid used_quantity" });
    }

    data.quantity = quantity;
    data.used_quantity = usedQuantity;

    if (usedQuantity > quantity) {
      const overage = usedQuantity - quantity;
      if (overage <= USED_QUANTITY_ROUNDING_TOLERANCE) {
        data.used_quantity = quantity;
      } else {
        return res.status(400).json({ error: "used_quantity cannot be greater than quantity" });
      }
    }

    const affected = await Batch.updateBatch(req.params.id, data);
    
    console.log('Batch update result - affected rows:', affected);
    
    if (!affected) {
      console.warn('No batch found with ID:', req.params.id);
      return res.status(404).json({ message: "Batch not found" });
    }
    
    console.log('Batch updated successfully - ID:', req.params.id);
    res.json({ message: "Batch updated" });
  } catch (err) {
    console.error('Error updating batch:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: err.message, details: err.sqlMessage || 'No SQL details' });
  }
};

// DELETE
exports.remove = async (req, res) => {
  try {
    const affected = await Batch.deleteBatch(req.params.id);
    if (!affected) return res.status(404).json({ message: "Batch not found" });
    res.json({ message: "Batch deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
