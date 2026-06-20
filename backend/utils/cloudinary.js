/* ============================================================
   VELORRA — Cloudinary Configuration
   Handles image & video uploads for product galleries.
   Returns null safely when credentials are not configured.
   ============================================================ */
const cloudinary = require('cloudinary').v2;

let configured = false;

function initCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn('⚠️  Cloudinary credentials not configured. Image/video uploads will be disabled.');
    return false;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key:    apiKey,
    api_secret: apiSecret,
    secure:     true,
  });

  configured = true;
  console.log('✅ Cloudinary configured — Cloud:', cloudName);
  return true;
}

function isCloudinaryAvailable() {
  return configured;
}

module.exports = { cloudinary, initCloudinary, isCloudinaryAvailable };
