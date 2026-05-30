const db = require("../config/mysql.js");

// CREATE
exports.createBatch = async (data) => {
  const { chemical_id, quantity, expiration_date, location, lot_number, qr_code } = data;
  const [result] = await db.execute(
    "INSERT INTO chemical_stock_batch (chemical_id, quantity, used_quantity, date_received, expiration_date, location, lot_number, qr_code) VALUES (?, ?, 0, NOW(), ?, ?, ?, ?)",
    [chemical_id, quantity, expiration_date || null, location || null, lot_number || null, qr_code || null]
  );
  return result.insertId;
};

// READ ALL
exports.getAllBatches = async (filters = {}) => {
  const { chemical_id, lot_number } = filters;
  const conditions = ["b.deleted_at IS NULL"];
  const params = [];

  if (chemical_id) {
    conditions.push("b.chemical_id = ?");
    params.push(chemical_id);
  }

  if (lot_number) {
    conditions.push("b.lot_number = ?");
    params.push(lot_number);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await db.execute(`
    SELECT b.*, r.name AS chemical_name, r.unit AS chemical_unit, r.threshold AS chemical_threshold
    FROM chemical_stock_batch b
    JOIN reagents_chemicals r ON b.chemical_id = r.chemical_id
    ${whereClause}
    ORDER BY b.date_received DESC, b.batch_id DESC
  `, params);
  return rows;
};

// READ ONE
exports.getBatchById = async (id) => {
  const [rows] = await db.execute(`
    SELECT b.*, r.name AS chemical_name, r.unit AS chemical_unit, r.threshold AS chemical_threshold
    FROM chemical_stock_batch b
    JOIN reagents_chemicals r ON b.chemical_id = r.chemical_id
    WHERE b.batch_id = ?
  `, [id]);
  return rows[0];
};

// UPDATE
exports.updateBatch = async (id, data) => {
  const { quantity, used_quantity, expiration_date, location, lot_number } = data;
  console.log('Batch model updateBatch called with:', { id, quantity, used_quantity, expiration_date, location, lot_number });
  
  try {
    const [result] = await db.execute(
      "UPDATE chemical_stock_batch SET quantity=?, used_quantity=?, expiration_date=?, location=?, lot_number=COALESCE(?, lot_number), deleted_at=CASE WHEN ? >= ? THEN NOW() ELSE NULL END WHERE batch_id=?",
      [quantity, used_quantity, expiration_date, location || null, lot_number || null, used_quantity, quantity, id]
    );
    console.log('Batch model update SQL result:', { affectedRows: result.affectedRows, changedRows: result.changedRows });
    return result.affectedRows;
  } catch (err) {
    console.error('Batch model update SQL error:', err.message, err.code, err.sqlState);
    throw err;
  }
};

// DELETE
exports.deleteBatch = async (id) => {
  const [result] = await db.execute("DELETE FROM chemical_stock_batch WHERE batch_id = ?", [id]);
  return result.affectedRows;
};
