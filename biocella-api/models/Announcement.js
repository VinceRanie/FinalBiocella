const db = require('../config/mysql');

let announcementsTableReady = false;

const ensureAnnouncementsTable = async () => {
  if (announcementsTableReady) return;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS announcement (
      announcement_id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description LONGTEXT NOT NULL,
      image_urls LONGTEXT NULL,
      links LONGTEXT NULL,
      deleted_by_user_id INT NULL,
      created_by_user_id INT NOT NULL,
      created_by_email VARCHAR(255) NOT NULL,
      created_by_role VARCHAR(50) NOT NULL DEFAULT 'admin',
      is_published TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL DEFAULT NULL,
      INDEX idx_announcement_published_created (is_published, deleted_at, created_at),
      INDEX idx_announcement_deleted_by (deleted_by_user_id),
      INDEX idx_announcement_created_by (created_by_user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
  `);

  announcementsTableReady = true;
};

const parseJsonField = (value, fallback = []) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeAnnouncementRow = (row) => ({
  announcement_id: row.announcement_id,
  title: row.title,
  description: row.description,
  image_urls: parseJsonField(row.image_urls, []),
  links: parseJsonField(row.links, []),
  created_by_user_id: row.created_by_user_id,
  created_by_email: row.created_by_email,
  created_by_role: row.created_by_role,
  deleted_by_user_id: row.deleted_by_user_id,
  is_published: Boolean(row.is_published),
  created_at: row.created_at,
  updated_at: row.updated_at,
  deleted_at: row.deleted_at,
});

exports.getPublishedAnnouncements = async (limit = 6) => {
  await ensureAnnouncementsTable();

  const safeLimit = Math.min(Math.max(Number(limit) || 6, 1), 20);
  const [rows] = await db.execute(
    `
      SELECT announcement_id, title, description, image_urls, links, created_by_user_id, created_by_email, created_by_role, is_published, created_at, updated_at
      FROM announcement
      WHERE is_published = 1 AND deleted_at IS NULL
      ORDER BY created_at DESC, announcement_id DESC
      LIMIT ?
    `,
    [safeLimit]
  );

  return rows.map(normalizeAnnouncementRow);
};

exports.getAllAnnouncements = async (limit = 50) => {
  await ensureAnnouncementsTable();

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const [rows] = await db.execute(
    `
      SELECT announcement_id, title, description, image_urls, links, deleted_by_user_id, created_by_user_id, created_by_email, created_by_role, is_published, created_at, updated_at, deleted_at
      FROM announcement
      ORDER BY created_at DESC, announcement_id DESC
      LIMIT ?
    `,
    [safeLimit]
  );

  return rows.map(normalizeAnnouncementRow);
};

exports.createAnnouncement = async ({
  title,
  description,
  imageUrls = [],
  links = [],
  createdByUserId,
  createdByEmail,
  createdByRole = 'admin',
  isPublished = true,
}) => {
  await ensureAnnouncementsTable();

  const [result] = await db.execute(
    `
      INSERT INTO announcement (
        title,
        description,
        image_urls,
        links,
        created_by_user_id,
        created_by_email,
        created_by_role,
        is_published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      title,
      description,
      JSON.stringify(imageUrls),
      JSON.stringify(links),
      createdByUserId,
      createdByEmail,
      createdByRole,
      isPublished ? 1 : 0,
    ]
  );

  return result.insertId;
};

exports.getAnnouncementById = async (announcementId) => {
  await ensureAnnouncementsTable();

  const [rows] = await db.execute(
    `
      SELECT announcement_id, title, description, image_urls, links, deleted_by_user_id, created_by_user_id, created_by_email, created_by_role, is_published, created_at, updated_at, deleted_at
      FROM announcement
      WHERE announcement_id = ? AND deleted_at IS NULL
      LIMIT 1
    `,
    [announcementId]
  );

  return rows[0] ? normalizeAnnouncementRow(rows[0]) : null;
};

exports.softDeleteAnnouncement = async (announcementId, deletedByUserId = null) => {
  await ensureAnnouncementsTable();

  const [result] = await db.execute(
    `
      UPDATE announcement
      SET deleted_at = CURRENT_TIMESTAMP, is_published = 0, deleted_by_user_id = ?
      WHERE announcement_id = ? AND deleted_at IS NULL
    `,
    [deletedByUserId, announcementId]
  );

  return result && result.affectedRows ? result.affectedRows : 0;
};

exports.restoreAnnouncement = async (announcementId) => {
  await ensureAnnouncementsTable();

  const [result] = await db.execute(
    `
      UPDATE announcement
      SET deleted_at = NULL, is_published = 1, deleted_by_user_id = NULL
      WHERE announcement_id = ? AND deleted_at IS NOT NULL
    `,
    [announcementId]
  );

  return result && result.affectedRows ? result.affectedRows : 0;
};