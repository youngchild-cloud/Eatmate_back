const multer = require('multer');
const path = require('path');
const fs = require('fs');

function createUploader({ destination, prefix, maxSizeMB = 5 }) {
  // 폴더 없으면 생성(선택이지만 편함)
  fs.mkdirSync(destination, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, destination),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${prefix}${Date.now()}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('이미지 파일만 업로드 가능합니다.'));
      }
      cb(null, true);
    },
  });
}

module.exports = { createUploader };
