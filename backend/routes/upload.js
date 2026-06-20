/* ============================================================
   VELORRA — Upload Routes
   Admin-only endpoint to upload product images/videos.
   Files are sent from the browser as multipart/form-data,
   held in memory briefly, then streamed to Cloudinary.
   ============================================================ */
const express = require('express');
const multer  = require('multer');
const { cloudinary, isCloudinaryAvailable } = require('../utils/cloudinary');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

/* ── Multer: keep file in memory (not saved to disk — disk is wiped on every
   Render restart/redeploy, so we stream straight to Cloudinary instead) ── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },  /* 25MB max (covers short product videos) */
  fileFilter: (req, file, cb) => {
    const okImage = file.mimetype.startsWith('image/');
    const okVideo = file.mimetype.startsWith('video/');
    if (okImage || okVideo) return cb(null, true);
    cb(new Error('Only image or video files are allowed.'));
  },
});

/* ── Helper: stream a buffer to Cloudinary ── */
function streamUpload(buffer, resourceType) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'velorra/products', resource_type: resourceType },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

/* ── POST /api/upload — single file (image or video), admin only ── */
router.post('/', requireAdmin, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed.' });
    if (!req.file) return res.status(400).json({ error: 'No file provided.' });

    if (!isCloudinaryAvailable()) {
      return res.status(503).json({ error: 'Image/video uploads are not configured on the server yet.' });
    }

    try {
      const resourceType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
      const result = await streamUpload(req.file.buffer, resourceType);
      return res.status(201).json({
        url:  result.secure_url,
        type: resourceType,
        publicId: result.public_id,
      });
    } catch (e) {
      console.error('Cloudinary upload error:', e);
      return res.status(500).json({ error: 'Failed to upload file. Please try again.' });
    }
  });
});

module.exports = router;
