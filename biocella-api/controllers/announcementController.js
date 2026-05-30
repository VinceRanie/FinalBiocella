const jwt = require('jsonwebtoken');
const Announcement = require('../models/Announcement');

const JWT_SECRET = process.env.JWT_TOKEN;

if (!JWT_SECRET) {
  throw new Error('JWT_TOKEN environment variable is required.');
}

const parseAuthenticatedUser = (req) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

const normalizeLinks = (value) => {
  if (!value) return [];

  let parsed = value;

  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((item) => ({
      label: String(item?.label || '').trim(),
      url: String(item?.url || '').trim(),
    }))
    .filter((item) => item.url.length > 0);
};

const normalizeImageUrls = (files = []) => {
  return files
    .map((file) => {
      const rawPath = String(file?.path || '').replace(/\\/g, '/');
      if (!rawPath) return '';
      const uploadsIndex = rawPath.toLowerCase().lastIndexOf('/uploads/');
      if (uploadsIndex >= 0) {
        return rawPath.slice(uploadsIndex);
      }
      const fallbackIndex = rawPath.toLowerCase().lastIndexOf('uploads/');
      if (fallbackIndex >= 0) {
        return `/${rawPath.slice(fallbackIndex)}`;
      }
      return '';
    })
    .filter(Boolean);
};

exports.listAnnouncements = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 20);
    const announcements = await Announcement.getPublishedAnnouncements(limit);

    return res.status(200).json(announcements);
  } catch (error) {
    console.error('List Announcements Error:', error);
    return res.status(500).json({ error: 'Failed to fetch announcements.' });
  }
};

exports.listAnnouncementsAdmin = async (req, res) => {
  try {
    const authUser = parseAuthenticatedUser(req);

    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (String(authUser.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can view announcement management.' });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const announcements = await Announcement.getAllAnnouncements(limit);

    return res.status(200).json(announcements);
  } catch (error) {
    console.error('List Announcements Admin Error:', error);
    return res.status(500).json({ error: 'Failed to fetch announcements.' });
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const authUser = parseAuthenticatedUser(req);

    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (String(authUser.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can create announcements.' });
    }

    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }

    const files = Array.isArray(req.files?.announcement_images)
      ? req.files.announcement_images
      : [];

    const imageUrls = normalizeImageUrls(files);
    const links = normalizeLinks(req.body.links);

    const announcementId = await Announcement.createAnnouncement({
      title,
      description,
      imageUrls,
      links,
      createdByUserId: Number(authUser.userId || authUser.user_id || 0),
      createdByEmail: String(authUser.email || '').trim(),
      createdByRole: String(authUser.role || 'admin').trim().toLowerCase(),
      isPublished: true,
    });

    const announcement = await Announcement.getAnnouncementById(announcementId);

    return res.status(201).json(announcement);
  } catch (error) {
    console.error('Create Announcement Error:', error);
    return res.status(500).json({ error: 'Failed to create announcement.' });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const authUser = parseAuthenticatedUser(req);

    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (String(authUser.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can delete announcements.' });
    }

    const announcementId = Number(req.params.id || 0);

    if (!announcementId || announcementId <= 0) {
      return res.status(400).json({ error: 'Invalid announcement id.' });
    }

    const deletedBy = Number(authUser.userId || authUser.user_id || 0) || null;
    const affected = await Announcement.softDeleteAnnouncement(announcementId, deletedBy);

    if (!affected) {
      return res.status(404).json({ error: 'Announcement not found or already deleted.' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete Announcement Error:', error);
    return res.status(500).json({ error: 'Failed to delete announcement.' });
  }
};

exports.restoreAnnouncement = async (req, res) => {
  try {
    const authUser = parseAuthenticatedUser(req);

    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (String(authUser.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can restore announcements.' });
    }

    const announcementId = Number(req.params.id || 0);

    if (!announcementId || announcementId <= 0) {
      return res.status(400).json({ error: 'Invalid announcement id.' });
    }

    const affected = await Announcement.restoreAnnouncement(announcementId);

    if (!affected) {
      return res.status(404).json({ error: 'Announcement not found or not deleted.' });
    }

    const announcement = await Announcement.getAnnouncementById(announcementId);

    return res.status(200).json(announcement);
  } catch (error) {
    console.error('Restore Announcement Error:', error);
    return res.status(500).json({ error: 'Failed to restore announcement.' });
  }
};