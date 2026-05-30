const Reagent = require("../models/reagentModel");
const Batch = require("../models/batchModel");
const QRCode = require("qrcode");
const db = require("../config/mysql");

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return NaN;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const ALL_UNITS = ["mL", "L", "g", "kg", "mg", "μL", "pieces", "bottles"];
const MASS_UNITS = ["g", "kg", "mg"];
const VOLUME_UNITS = ["mL", "L", "μL"];

const getAllowedUnitsForType = (type) => {
  const normalized = String(type || "").trim().toLowerCase();

  if (["agar", "protein", "salt", "dye", "stain", "enzyme", "antibody"].includes(normalized)) {
    return MASS_UNITS;
  }

  if (["acid", "base", "buffer", "solvent"].includes(normalized)) {
    return VOLUME_UNITS;
  }

  return ALL_UNITS;
};

const isTypeUnitValid = (type, unit) => {
  const normalizedUnit = String(unit || "").trim();
  if (!normalizedUnit) return false;
  return getAllowedUnitsForType(type).includes(normalizedUnit);
};

// CREATE
exports.create = async (req, res) => {
  try {
    const { name, type, quantity, unit, threshold, expiration_date, location } = req.body;
    const resolvedType = String(type || "General").trim() || "General";
    const lot_number = typeof req.body.lot_number === "string" ? req.body.lot_number.trim() : "";
    const parsedQuantity = Number(quantity);
    const parsedThreshold = Number(threshold);
    
    console.log('Creating chemical with data:', { name, type: resolvedType, quantity, unit, threshold, expiration_date, location, lot_number });

    if (!lot_number) {
      return res.status(400).json({ error: "lot_number is required when creating a container" });
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ error: "quantity must be greater than 0" });
    }

    if (!Number.isFinite(parsedThreshold) || parsedThreshold < 0) {
      return res.status(400).json({ error: "threshold must be 0 or greater" });
    }

    if (!isTypeUnitValid(resolvedType, unit)) {
      return res.status(400).json({
        error: `Unit ${unit} is not valid for type ${resolvedType}. Allowed units: ${getAllowedUnitsForType(resolvedType).join(", ")}`,
      });
    }

    const existingChemical = await Reagent.findReagentByIdentity({
      name,
      type: resolvedType,
      unit,
    });

    let chemicalId = null;
    let effectiveThreshold = parsedThreshold;

    if (existingChemical) {
      chemicalId = Number(existingChemical.chemical_id);
      effectiveThreshold = parsedThreshold;

      const existingQuantity = Number(existingChemical.quantity || 0);
      await Reagent.updateReagent(chemicalId, {
        name: existingChemical.name,
        type: existingChemical.type,
        quantity: Math.max(0, existingQuantity) + parsedQuantity,
        unit: existingChemical.unit,
        threshold: effectiveThreshold,
      });

      console.log('Existing chemical reused with ID:', chemicalId);
    } else {
      // Create the chemical entry (master record)
      chemicalId = await Reagent.createReagent({
        name,
        type: resolvedType,
        quantity: parsedQuantity,
        unit,
        threshold: parsedThreshold,
      });

      console.log('Chemical created with ID:', chemicalId);
    }
    
    // Create the batch entry (physical container)
    const batchData = {
      chemical_id: chemicalId,
      quantity: parsedQuantity,
      expiration_date: expiration_date || null,
      location: location || null,
      lot_number,
      qr_code: null
    };
    
    console.log('Creating batch with data:', batchData);
    
    const batchId = await Batch.createBatch(batchData);
    
    console.log('Batch created with ID:', batchId);
    
    // Generate QR code with role-resolved scan URL.
    const baseUrl = (process.env.FRONTEND_URL || 'https://testbiocella.dcism.org').replace(/\/+$/, '');
    const qrUrl = `${baseUrl}/scan/batch/${batchId}`;
    const qrCodeDataURL = await QRCode.toDataURL(qrUrl);
    
    console.log('QR code generated');
    
    // Update the batch with the QR code (don't change other fields)
    await db.execute(
      "UPDATE chemical_stock_batch SET qr_code=? WHERE batch_id=?",
      [qrCodeDataURL, batchId]
    );
    
    console.log('Batch updated with QR code');
    
    res.status(201).json({ 
      message: existingChemical ? "Container added to existing chemical" : "Chemical and batch created", 
      chemical_id: chemicalId,
      batch_id: batchId,
      threshold_applied: effectiveThreshold,
      reused_existing_chemical: Boolean(existingChemical),
      qr_code: qrCodeDataURL
    });
  } catch (err) {
    console.error('Error creating chemical:', err);
    res.status(500).json({ error: err.message });
  }
};

// READ ALL
exports.getAll = async (req, res) => {
  try {
    const chemicals = await Reagent.getAllReagents();
    res.json(chemicals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ ONE
exports.getById = async (req, res) => {
  try {
    const chemical = await Reagent.getReagentById(req.params.id);
    if (!chemical) return res.status(404).json({ message: "Chemical not found" });
    res.json(chemical);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
exports.update = async (req, res) => {
  try {
    const parsedThreshold = toNumber(req.body.threshold);

    if (!Number.isFinite(parsedThreshold) || parsedThreshold < 0) {
      return res.status(400).json({ error: "threshold must be 0 or greater" });
    }

    if (!isTypeUnitValid(req.body.type, req.body.unit)) {
      return res.status(400).json({
        error: `Unit ${req.body.unit} is not valid for type ${req.body.type}. Allowed units: ${getAllowedUnitsForType(req.body.type).join(", ")}`,
      });
    }

    // Keep chemical.quantity aligned with current active container totals.
    const batches = await Batch.getAllBatches({ chemical_id: req.params.id });
    const parsedQuantity = batches.reduce((sum, batch) => {
      const qty = toNumber(batch.quantity);
      const used = toNumber(batch.used_quantity);
      return sum + Math.max(0, qty - used);
    }, 0);

    const affected = await Reagent.updateReagent(req.params.id, {
      ...req.body,
      quantity: parsedQuantity,
      threshold: parsedThreshold,
    });
    if (!affected) return res.status(404).json({ message: "Chemical not found" });

    res.json({
      message: "Chemical updated",
      quantity_source: "derived_from_active_batches",
      derived_quantity: parsedQuantity,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
exports.remove = async (req, res) => {
  try {
    console.log('Attempting to delete chemical with ID:', req.params.id);
    
    const db = require('../config/mysql');
    
    // CORRECT ORDER: Delete child records first, then parent
    // 1. Delete usage logs (references batch_id)
    await db.execute('DELETE FROM chemical_usage_log WHERE chemical_id = ?', [req.params.id]);
    console.log('Deleted associated usage logs');
    
    // 2. Delete batches (references chemical_id)
    await db.execute('DELETE FROM chemical_stock_batch WHERE chemical_id = ?', [req.params.id]);
    console.log('Deleted associated batches');
    
    // 3. Now delete the chemical (parent record)
    const affected = await Reagent.deleteReagent(req.params.id);
    console.log('Delete operation affected rows:', affected);
    if (!affected) return res.status(404).json({ message: "Chemical not found" });
    res.json({ message: "Chemical and associated records deleted" });
  } catch (err) {
    console.error('Error deleting chemical:', err);
    res.status(500).json({ error: err.message });
  }
};
