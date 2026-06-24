"use strict";

const $ = (id) => document.getElementById(id);

const fileInput = $("file");
const analyzeBtn = $("analyze");
const thresholdInput = $("threshold");
const thrVal = $("thr-val");
const topkInput = $("topk");
const player = $("player");
const statusEl = $("status");
const resultsEl = $("results");

let selectedFile = null;
let objectUrl = null;

// ---- backend health badge -------------------------------------------------
fetch("/api/health")
  .then((r) => r.json())
  .then((h) => {
    const badge = $("backend-badge");
    badge.textContent = `${h.backend} · ${h.n_classes.toLocaleString()} classes`;
    badge.classList.add(h.backend === "mock" ? "badge-mock" : "badge-real");
    if (h.backend === "mock") {
      badge.title = "MOCK backend: illustrative labels, not the real model. Set PERCH_MOCK=0 with Kaggle access for real inference.";
    }
  })
  .catch(() => {
    $("backend-badge").textContent = "offline";
  });

// ---- file selection -------------------------------------------------------
fileInput.addEventListener("change", () => {
  selectedFile = fileInput.files[0] || null;
  $("filename").textContent = selectedFile ? selectedFile.name : "";
  analyzeBtn.disabled = !selectedFile;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  if (selectedFile) {
    objectUrl = URL.createObjectURL(selectedFile);
    player.src = objectUrl;
    player.hidden = false;
  }
});

thresholdInput.addEventListener("input", () => {
  thrVal.textContent = Number(thresholdInput.value).toFixed(2);
});

// ---- analyze --------------------------------------------------------------
analyzeBtn.addEventListener("click", async () => {
  if (!selectedFile) return;
  analyzeBtn.disabled = true;
  setStatus("Analyzing… (first run on the real model loads weights and may take a while)", "working");
  resultsEl.hidden = true;

  const form = new FormData();
  form.append("file", selectedFile);
  const params = new URLSearchParams({
    threshold: thresholdInput.value,
    top_k: topkInput.value,
  });

  try {
    const resp = await fetch(`/api/predict?${params}`, { method: "POST", body: form });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(err.detail || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    render(data);
    setStatus(`Done — ${data.n_windows} window(s) over ${data.duration_sec.toFixed(1)}s.`, "ok");
  } catch (e) {
    setStatus(`Error: ${e.message}`, "error");
  } finally {
    analyzeBtn.disabled = false;
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
    `<span>Duration: <b>${data.duration_sec.toFixed(1)}s</b></span>` +
    `<span>Windows: <b>${data.n_windows}</b></span>` +
    `<span>Sample rate: <b>${data.sample_rate} Hz</b></span>` +
    `<span>Backend: <b>${data.backend}</b></span>`;

  // summary table
  const tbody = $("summary").querySelector("tbody");
  tbody.innerHTML = "";
  if (data.summary.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">No species above the threshold. Try lowering it.</td></tr>`;
  }
  for (const s of data.summary) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td>${escapeHtml(s.common_name || "—")}</td>` +
      `<td class="sci">${escapeHtml(s.scientific_name)}</td>` +
      `<td>${confBar(s.max_score)}</td>` +
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
      .map(
        (d) =>
          `<span class="chip" title="${escapeHtml(d.scientific_name)}">` +
          `${escapeHtml(d.common_name || d.scientific_name)} ${(d.score * 100).toFixed(0)}%</span>`
      )
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

function confBar(score) {
  const pct = Math.round(score * 100);
  return `<div class="bar"><span style="width:${pct}%"></span><em>${pct}%</em></div>`;
}

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
