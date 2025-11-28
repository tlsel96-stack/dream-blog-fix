// ocr.js
document.addEventListener("DOMContentLoaded", () => {
  const pasteArea = document.getElementById("pasteArea");
  const referenceInput = document.getElementById("referenceInput");
  const status = document.getElementById("status");

  pasteArea.addEventListener("paste", async (e) => {
    e.preventDefault();

    const items = e.clipboardData.items;
    let imageFile = null;

    for (const item of items) {
      if (item.type.indexOf("image") !== -1) {
        imageFile = item.getAsFile();
        break;
      }
    }

    if (!imageFile) {
      status.innerHTML = "❌ 인식 실패: 이미지가 없습니다.";
      return;
    }

    status.innerHTML = "🔍 이미지 인식 중...";

    try {
      const formData = new FormData();
      formData.append("file", imageFile);

      const res = await fetch("/api/vision", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (data.ok && data.text) {
        referenceInput.value = data.text.trim();
        status.innerHTML = "✅ 인식 완료!";
      } else {
        status.innerHTML = "❌ 인식 실패: " + (data.error || "텍스트 없음");
      }
    } catch (err) {
      console.error(err);
      status.innerHTML = "❌ 인식 중 오류 발생";
    }
  });
});
