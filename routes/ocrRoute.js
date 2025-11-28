import express from "express";
import multer from "multer";
import { runOCR } from "../ocr.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/ocr", upload.single("image"), async (req, res) => {
  try {
    const text = await runOCR(req.file.path);

    res.json({
      ok: true,
      text,
    });
  } catch (e) {
    console.error(e);
    res.json({
      ok: false,
      error: "OCR 실패",
    });
  }
});

export default router;
