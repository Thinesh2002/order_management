const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ROOT images folder
const baseUploadDir = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "images",
  "products"
);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // Get SKU from body (create) or params (update)
      const sku = req.body.sku || req.params.sku;

      if (!sku) {
        return cb(new Error("SKU is required for image upload"));
      }

      const skuDir = path.join(baseUploadDir, sku);

      // Create SKU folder if not exists
      fs.mkdirSync(skuDir, { recursive: true });

      cb(null, skuDir);
    } catch (err) {
      cb(err);
    }
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname).toLowerCase());
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // ✅ 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedExt = [".jpg", ".jpeg", ".png", ".webp"];
    const allowedMime = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;

    if (allowedExt.includes(ext) && allowedMime.includes(mime)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only JPG, JPEG, PNG, and WEBP image files are allowed"
        )
      );
    }
  },
});

module.exports = upload;
