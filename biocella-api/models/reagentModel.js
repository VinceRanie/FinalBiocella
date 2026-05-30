const db = require("../config/mysql.js");

// CREATE
exports.createReagent = async (data) => {
  const { name, type, quantity, unit, threshold } = data;
  const [result] = await db.execute(
    "INSERT INTO reagents_chemicals (name, type, quantity, unit, threshold, last_updated) VALUES (?, ?, ?, ?, ?, NOW())",
    [name, type || 'General', quantity, unit, threshold]
  );
  return result.insertId;
};

// READ ALL
exports.getAllReagents = async () => {
  const [rows] = await db.execute(`
    SELECT r.*
    FROM reagents_chemicals r
    WHERE EXISTS (
      SELECT 1
      FROM chemical_stock_batch b
      WHERE b.chemical_id = r.chemical_id
        AND b.deleted_at IS NULL
    )
  `);
  return rows;
};

// READ ONE
exports.getReagentById = async (id) => {
  const [rows] = await db.execute("SELECT * FROM reagents_chemicals WHERE chemical_id = ?", [id]);
  return rows[0];
};

// READ ONE BY IDENTITY (name + type + unit), used to attach new lots to an existing chemical
exports.findReagentByIdentity = async ({ name, type, unit }) => {
  const [rows] = await db.execute(
    `
      SELECT *
      FROM reagents_chemicals
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
        AND LOWER(TRIM(type)) = LOWER(TRIM(?))
        AND unit = ?
      LIMIT 1
    `,
    [name, type, unit]
  );

  return rows[0] || null;
};

// UPDATE
exports.updateReagent = async (id, data) => {
  const { name, type, quantity, unit, threshold } = data;
  const [result] = await db.execute(
    "UPDATE reagents_chemicals SET name=?, type=?, quantity=?, unit=?, threshold=?, last_updated=NOW() WHERE chemical_id=?",
    [name, type || 'General', quantity, unit, threshold, id]
  );
  return result.affectedRows;
};

// DELETE
exports.deleteReagent = async (id) => {
  const [result] = await db.execute("DELETE FROM reagents_chemicals WHERE chemical_id = ?", [id]);
  return result.affectedRows;
};
