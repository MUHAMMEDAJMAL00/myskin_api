"use strict";

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const uuidv4 = () => crypto.randomUUID();

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function makeStorage(folder) {
  const dest = path.join(__dirname, "../uploads", folder);
  ensureDir(dest);
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, uuidv4() + ext);
    },
  });
}

const imageFilter = (_req, file, cb) => {
  const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) return cb(null, true);
  cb(
    new Error("Only image files are allowed (jpg, jpeg, png, webp, gif)"),
    false,
  );
};

const uploadProductImage = multer({
  storage: makeStorage("products"),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("image");

const uploadCategoryImage = multer({
  storage: makeStorage("categories"),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("image");

const xlsxFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if ([".xlsx", ".xls"].includes(ext)) return cb(null, true);
  cb(new Error("Only .xlsx or .xls files are allowed"), false);
};

const uploadProductXlsx = multer({
  storage: multer.memoryStorage(),
  fileFilter: xlsxFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single("file");

module.exports = { uploadProductImage, uploadCategoryImage, uploadProductXlsx };
