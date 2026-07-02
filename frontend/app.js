"use strict";

const $ = (id) => document.getElementById(id);

const fileInput = $("file");
const dropZone = $("drop");
const analyzeBtn = $("analyze");
const thresholdInput = $("threshold");
const thrVal = $("thr-val");
const topkInput = $("topk");
const regionBoostInput = $("region-boost");
const player = $("player");
const statusEl = $("status");
const progressEl = $("progress");
const resultsEl = $("results");
const loadingBanner = $("loading-banner");
const recordBtn = $("record");
const recordStatus = $("record-status");
const exportCsvBtn = $("export-csv");
const exportJsonBtn = $("export-json");

let selectedFile = null;
let objectUrl = null;
let modelReady = false;
let lastResult = null;

// ---- backend health: poll until the server/model is up --------------------
// During model load the server isn't accepting connections yet, so a failed
// fetch here just means "not ready" — keep retrying rather than giving up.
function pollHealth() {
  fetch("/api/health")
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((h) => {
      modelReady = true;
      loadingBanner.hidden = true;
      const badge = $("backend-badge");
      badge.textContent = `${h.backend} · ${h.n_classes.toLocaleString()} クラス`;
      badge.classList.remove("badge-mock", "badge-real");
      badge.classList.add(h.backend === "mock" ? "badge-mock" : "badge-real");
      badge.title =
        h.backend === "mock"
          ? "モックバックエンド: ラベルはデモ用のダミーで実モデルではありません。実推論には Kaggle アクセス下で PERCH_MOCK=0 を設定してください。"
          : "現在のモデルバックエンド";
      updateAnalyzeEnabled();
    })
    .catch(() => {
      modelReady = false;
      loadingBanner.hidden = false;
      $("backend-badge").textContent = "起動中…";
      updateAnalyzeEnabled();
      setTimeout(pollHealth, 1500);
    });
}
pollHealth();

function updateAnalyzeEnabled() {
  analyzeBtn.disabled = !selectedFile || !modelReady;
}

// ---- file selection (input picker, drag & drop, and recordings all land here)
function selectFile(file) {
  selectedFile = file || null;
  $("filename").textContent = selectedFile ? selectedFile.name : "";
  updateAnalyzeEnabled();
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  if (selectedFile) {
    objectUrl = URL.createObjectURL(selectedFile);
    player.src = objectUrl;
    player.hidden = false;
  }
}

fileInput.addEventListener("change", () => selectFile(fileInput.files[0] || null));

// ---- drag & drop ------------------------------------------------------------
["dragenter", "dragover"].forEach((evt) =>
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  })
);
["dragleave", "dragend"].forEach((evt) =>
  dropZone.addEventListener(evt, () => dropZone.classList.remove("dragover"))
);
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) selectFile(file);
});

// ---- in-browser recording ---------------------------------------------------
let mediaRecorder = null;
let recordedChunks = [];
let recordStartedAt = 0;
let recordTimerId = null;

function pickRecordingMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  for (const type of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

function extensionForMimeType(mime) {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "mp4";
  return "webm";
}

recordBtn.addEventListener("click", async () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
    recordStatus.textContent = "この端末・ブラウザは録音に対応していません。";
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = pickRecordingMimeType();
    mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    recordedChunks = [];

    mediaRecorder.addEventListener("dataavailable", (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    });
    mediaRecorder.addEventListener("stop", () => {
      stream.getTracks().forEach((t) => t.stop());
      clearInterval(recordTimerId);
      const mime = mediaRecorder.mimeType || "audio/webm";
      const blob = new Blob(recordedChunks, { type: mime });
      const ext = extensionForMimeType(mime);
      const file = new File([blob], `recording-${Date.now()}.${ext}`, { type: mime });
      selectFile(file);
      recordBtn.textContent = "🎙 その場で録音";
      recordBtn.classList.remove("recording");
      recordStatus.textContent = `録音完了（${fmt((Date.now() - recordStartedAt) / 1000)}）`;
    });

    mediaRecorder.start();
    recordStartedAt = Date.now();
    recordBtn.textContent = "■ 停止";
    recordBtn.classList.add("recording");
    recordTimerId = setInterval(() => {
      recordStatus.textContent = `● 録音中 ${fmt((Date.now() - recordStartedAt) / 1000)}`;
    }, 250);
  } catch (e) {
    recordStatus.textContent = `マイクを利用できません: ${e.message}`;
  }
});

thresholdInput.addEventListener("input", () => {
  thrVal.textContent = Number(thresholdInput.value).toFixed(2);
});

// ---- analyze --------------------------------------------------------------
let elapsedTimerId = null;

analyzeBtn.addEventListener("click", async () => {
  if (!selectedFile) return;
  analyzeBtn.disabled = true;
  resultsEl.hidden = true;
  progressEl.hidden = false;

  const startedAt = Date.now();
  setStatus("解析中…（実モデルの初回は重みの読み込みに時間がかかることがあります）", "working");
  elapsedTimerId = setInterval(() => {
    setStatus(`解析中… ${fmt((Date.now() - startedAt) / 1000)} 経過`, "working");
  }, 1000);

  const form = new FormData();
  form.append("file", selectedFile);
  const params = new URLSearchParams({
    threshold: thresholdInput.value,
    top_k: topkInput.value,
    region_boost: regionBoostInput.checked,
  });

  try {
    const resp = await fetch(`/api/predict?${params}`, { method: "POST", body: form });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(err.detail || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    lastResult = data;
    render(data);
    setStatus(`完了 — ${data.duration_sec.toFixed(1)} 秒を ${data.n_windows} 窓で解析しました。`, "ok");
  } catch (e) {
    setStatus(`エラー: ${e.message}`, "error");
  } finally {
    clearInterval(elapsedTimerId);
    progressEl.hidden = true;
    updateAnalyzeEnabled();
  }
});

function setStatus(msg, kind) {
  statusEl.textContent = msg;
  statusEl.className = "status " + (kind || "");
}

// ---- rendering ------------------------------------------------------------
function render(data) {
  resultsEl.hidden = false;

  $("meta").innerHTML =
    `<span>長さ: <b>${data.duration_sec.toFixed(1)}秒</b></span>` +
    `<span>窓数: <b>${data.n_windows}</b></span>` +
    `<span>サンプルレート: <b>${data.sample_rate} Hz</b></span>` +
    `<span>バックエンド: <b>${data.backend}</b></span>`;

  // summary table
  const tbody = $("summary").querySelector("tbody");
  tbody.innerHTML = "";
  if (data.summary.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">しきい値を超える種はありません。しきい値を下げてみてください。</td></tr>`;
  }
  // Bars are scaled relative to the strongest logit so the top species separate
  // (sigmoid probabilities saturate near 1.0 and would all look identical).
  const topLogit = Math.max(0.0001, ...data.summary.map((s) => s.max_logit));
  for (const s of data.summary) {
    const tr = document.createElement("tr");
    const flag = s.in_region ? '<span class="region-flag" title="日本でよく見られる種（簡易チェックリスト）">🗾</span> ' : "";
    tr.innerHTML =
      `<td>${flag}${escapeHtml(s.common_name || "—")}</td>` +
      `<td class="sci">${escapeHtml(s.scientific_name)}</td>` +
      `<td>${confBar(s.max_logit, topLogit, s.max_score)}</td>` +
      `<td>${s.n_windows}</td>`;
    tbody.appendChild(tr);
  }

  // timeline
  const timeline = $("timeline");
  timeline.innerHTML = "";
  for (const win of data.windows) {
    const div = document.createElement("div");
    div.className = "window" + (win.detections.length ? "" : " quiet");
    const time = `${fmt(win.start)}–${fmt(win.end)}`;
    const chips = win.detections
      .map((d) => {
        const flag = d.in_region ? "🗾 " : "";
        return (
          `<span class="chip" title="${escapeHtml(d.scientific_name)} · 確率 ${(d.score * 100).toFixed(1)}%">` +
          `${flag}${escapeHtml(d.common_name || d.scientific_name)} <b>${d.logit.toFixed(1)}</b></span>`
        );
      })
      .join("");
    div.innerHTML =
      `<button class="seek" data-t="${win.start}">▶ ${time}</button>` +
      `<div class="chips">${chips || '<span class="none">—</span>'}</div>`;
    timeline.appendChild(div);
  }
  timeline.querySelectorAll(".seek").forEach((b) =>
    b.addEventListener("click", () => {
      player.currentTime = Number(b.dataset.t);
      player.play();
    })
  );
}

function confBar(logit, topLogit, prob) {
  const pct = Math.max(0, Math.min(100, Math.round((logit / topLogit) * 100)));
  return (
    `<div class="bar" title="確率 ${(prob * 100).toFixed(1)}%">` +
    `<span style="width:${pct}%"></span><em>${logit.toFixed(1)}</em></div>`
  );
}

// ---- export -----------------------------------------------------------------
function downloadBlob(content, mime, filename) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvField(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function resultToCsv(data) {
  const rows = [["種（和名）", "学名", "地域", "確信度(logit)", "確率(%)", "検出窓数"]];
  for (const s of data.summary) {
    rows.push([
      s.common_name || "",
      s.scientific_name,
      s.in_region ? "日本" : "",
      s.max_logit.toFixed(3),
      (s.max_score * 100).toFixed(1),
      s.n_windows,
    ]);
  }
  // Leading BOM so Excel opens UTF-8 (Japanese text) correctly.
  return "﻿" + rows.map((r) => r.map(csvField).join(",")).join("\r\n");
}

exportCsvBtn.addEventListener("click", () => {
  if (!lastResult) return;
  downloadBlob(resultToCsv(lastResult), "text/csv;charset=utf-8", `perch-result-${Date.now()}.csv`);
});

exportJsonBtn.addEventListener("click", () => {
  if (!lastResult) return;
  downloadBlob(JSON.stringify(lastResult, null, 2), "application/json", `perch-result-${Date.now()}.json`);
});

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
