const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

const uploadToCloudinary = async (buffer) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: 'cocktail-images',
        transformation: [
          { width: 800, height: 600, crop: 'fill', quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    ).end(buffer);
  });
};

const uploadMultipleToCloudinary = async (files) => {
  try {
    const uploadPromises = files.map((file, index) => {
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'auto',
            folder: 'cocktail-images',
            transformation: [
              { width: 800, height: 600, crop: 'fill', quality: 'auto' }
            ]
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                public_id: result.public_id,
                url: result.secure_url,
                isPrimary: index === 0 // First image is primary by default
              });
            }
          }
        ).end(file.buffer);
      });
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    throw new Error(`Failed to upload images: ${error.message}`);
  }
};

module.exports = {
  upload,
  uploadToCloudinary,
  uploadMultipleToCloudinary
};
