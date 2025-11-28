require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const app = express();
const upload = multer({ dest: "uploads/" });
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));


/* =============================
   1️⃣ OCR API — 이미지 → 텍스트
============================= */
app.post("/api/vision", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.json({ ok: false, error: "이미지 없음" });

    const base64 = fs.readFileSync(file.path, { encoding: "base64" });

    const gptRes = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "이미지 속 글자를 번역하지 말고 그대로 인식해서 추출해줘." },
            { type: "input_image", image_url: `data:image/png;base64,${base64}` }
          ]
        }
      ]
    });

    const text = gptRes.output_text?.trim() || "";
    fs.unlinkSync(file.path);

    return res.json({ ok: true, text });
  } catch (err) {
    console.error("❌ OCR ERROR:", err);
    return res.json({ ok: false, error: err.message || "OCR 처리 실패" });
  }
});


/* =============================
   2️⃣ 글 생성 API
============================= */
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    const completion = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const raw = completion.output_text?.trim() || "";
    const clean = raw.replace(/```json/i, "").replace(/```/g, "").trim();

    let parsed;

    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      const match = clean.match(/"title"\s*:\s*"([^"]+)"[\s\S]*"body"\s*:\s*"([\s\S]+)"/);
      if (match) {
        parsed = { title: match[1], body: match[2] };
      } else {
        const lines = clean.split("\n").filter(Boolean);
        parsed = {
          title: lines[0] || "",
          body: lines.slice(1).join("\n") || ""
        };
      }
    }

    parsed.title = parsed.title.replace(/^["'\s]+|["'\s]+$/g, "");
    parsed.body = parsed.body.replace(/^["'\s]+|["'\s]+$/g, "");

    return res.json({
      ok: true,
      data: {
        title: parsed.title,
        body: parsed.body
      }
    });

  } catch (err) {
    console.error("❌ GENERATE ERROR:", err);
    return res.status(500).json({ ok: false, error: "글 생성 실패" });
  }
});


/* =============================
   3️⃣ GUIDE 이미지 목록 API
============================= */
app.get("/api/guide-images", (req, res) => {
  try {
    const guidePath = path.join(__dirname, "public", "guide");

    const files = fs
      .readdirSync(guidePath)
      .filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return res.json({ ok: true, images: files });

  } catch (err) {
    console.error("❌ GUIDE ERROR:", err);
    return res.json({ ok: false, images: [] });
  }
});


/* =============================
   4️⃣ 정적 파일 제공 (맨 마지막)
============================= */
app.use(express.static(path.join(__dirname, "public")));


/* =============================
   5️⃣ 서버 실행
============================= */
const PORT = 4000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
