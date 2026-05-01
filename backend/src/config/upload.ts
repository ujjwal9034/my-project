import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Create uploads directory if not exists
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

function fileFilter(req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const filetypes = /jpe?g|png|webp|gif/;
  const mimetypes = /image\/(jpe?g|png|webp|gif)/;

  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = mimetypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpg, jpeg, png, webp, gif) are allowed!'));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

export default upload;
