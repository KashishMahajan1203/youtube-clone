"use strict";
import multer from "multer";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      new Date().toISOString().replace(/:/g, "-") + "-" + file.originalname
    );
  },
});

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// "file" must be an MP4 video; "thumbnail" an image. Anything else is dropped.
const filefilter = (req, file, cb) => {
  if (file.fieldname === "file") {
    cb(null, file.mimetype === "video/mp4");
  } else if (file.fieldname === "thumbnail") {
    cb(null, IMAGE_TYPES.includes(file.mimetype));
  } else {
    cb(null, false);
  }
};
const upload = multer({ storage: storage, fileFilter: filefilter });
export default upload;
