const multer = require('multer');
const path = require('path');

// Configure storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    let uploadPath = path.join(__dirname, '..', 'uploads');
    
    if (file.fieldname === 'carImages') {
      uploadPath = path.join(__dirname, '..', 'uploads', 'cars');
    } else if (file.fieldname === 'avatar') {
      uploadPath = path.join(__dirname, '..', 'uploads', 'avatars');
    } else if (file.fieldname === 'documents') {
      uploadPath = path.join(__dirname, '..', 'uploads', 'documents');
    }
    
    // Create directory if it doesn't exist
    const fs = require('fs');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|webp/;
  const allowedDocTypes = /pdf|doc|docx/;
  
  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;

  if (file.fieldname === 'documents') {
    const isValidDoc = allowedDocTypes.test(extname.slice(1)) && 
                       (mimetype.includes('pdf') || mimetype.includes('document'));
    if (isValidDoc) {
      return cb(null, true);
    }
  } else {
    const isValidImage = allowedImageTypes.test(extname.slice(1)) && 
                        mimetype.startsWith('image/');
    if (isValidImage) {
      return cb(null, true);
    }
  }

  cb(new Error('Invalid file type. Only JPEG, PNG, WEBP images or PDF documents are allowed.'));
};

// Upload middleware
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 // 5MB default
  },
  fileFilter: fileFilter
});

module.exports = upload;
