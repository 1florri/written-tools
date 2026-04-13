const clearBtn = document.getElementById("clearBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const eraserBtn = document.getElementById("eraserBtn");
const closeBtn = document.getElementById("closeBtn");
const toolbar = document.getElementById("toolbar");
const canvas = document.getElementById("draftCanvas");
const toast = document.getElementById("toast");
const brushButtons = Array.from(document.querySelectorAll(".brush"));
const sizeButtons = Array.from(document.querySelectorAll(".size-btn"));

const ctx = canvas.getContext("2d");
ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.lineWidth = 1;

let currentBrush = null;
let isDrawing = false;
let brushSize = 1;
let isEraserMode = false;
let isClickThrough = true;
const undoStack = [];
const redoStack = [];
const maxHistory = 30;

function formatDefaultFileName() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `桌面草稿_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.png`;
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function setBrushVisual(key) {
  brushButtons.forEach((btn) => {
    btn.classList.remove("active-black", "active-red", "active-blue", "active-green");
    if (btn.dataset.key === key) {
      btn.classList.add(`active-${key}`);
    }
  });
}

function clearBrushVisual() {
  brushButtons.forEach((btn) => {
    btn.classList.remove("active-black", "active-red", "active-blue", "active-green");
  });
}

function enableDraftMode(color, key) {
  currentBrush = color;
  isEraserMode = false;
  setClickThrough(false);
  eraserBtn.classList.remove("active");
  setBrushVisual(key);
}

function enableEraserMode() {
  isEraserMode = true;
  currentBrush = null;
  setClickThrough(false);
  eraserBtn.classList.add("active");
  clearBrushVisual();
}

function disableDraftMode({ clear = false } = {}) {
  currentBrush = null;
  isEraserMode = false;
  isDrawing = false;
  setClickThrough(true);
  eraserBtn.classList.remove("active");
  clearBrushVisual();
  if (clear) {
    clearCanvas();
  }
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function syncCanvasSize() {
  const nextWidth = Math.max(1, Math.floor(window.innerWidth));
  const nextHeight = Math.max(1, Math.floor(window.innerHeight));
  if (canvas.width === nextWidth && canvas.height === nextHeight) {
    return;
  }

  const snapshot = canvas.width > 0 && canvas.height > 0 ? canvas.toDataURL("image/png") : null;
  const prevWidth = canvas.width || 1;
  const prevHeight = canvas.height || 1;

  canvas.width = nextWidth;
  canvas.height = nextHeight;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = brushSize;

  if (!snapshot) {
    return;
  }

  const image = new Image();
  image.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, prevWidth, prevHeight, 0, 0, canvas.width, canvas.height);
  };
  image.src = snapshot;
}

function updateUndoRedoButtons() {
  undoBtn.disabled = undoStack.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

function pushUndoSnapshot() {
  undoStack.push(canvas.toDataURL("image/png"));
  if (undoStack.length > maxHistory) {
    undoStack.shift();
  }
  redoStack.length = 0;
  updateUndoRedoButtons();
}

function restoreFromDataUrl(dataUrl) {
  const image = new Image();
  image.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, canvas.width, canvas.height);
  };
  image.src = dataUrl;
}

function getPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function startDraw(event) {
  if (isClickThrough || (!isEraserMode && !currentBrush)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  pushUndoSnapshot();
  isDrawing = true;
  ctx.beginPath();
  const { x, y } = getPoint(event);
  ctx.moveTo(x, y);
}

function drawing(event) {
  if (isClickThrough || !isDrawing) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  const { x, y } = getPoint(event);
  ctx.strokeStyle = isEraserMode ? "#ffffff" : currentBrush;
  ctx.lineWidth = brushSize;
  ctx.lineTo(x, y);
  ctx.stroke();
}

function endDraw(event) {
  if (isClickThrough || !isDrawing) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  isDrawing = false;
  ctx.closePath();
}

function exportCanvasWithWhiteBackground() {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.fillStyle = "#ffffff";
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  tempCtx.drawImage(canvas, 0, 0);
  return tempCanvas.toDataURL("image/png");
}

clearBtn.addEventListener("click", () => {
  pushUndoSnapshot();
  clearCanvas();
});

undoBtn.addEventListener("click", () => {
  if (undoStack.length === 0) {
    return;
  }
  redoStack.push(canvas.toDataURL("image/png"));
  if (redoStack.length > maxHistory) {
    redoStack.shift();
  }
  const snapshot = undoStack.pop();
  restoreFromDataUrl(snapshot);
  updateUndoRedoButtons();
});

redoBtn.addEventListener("click", () => {
  if (redoStack.length === 0) {
    return;
  }
  undoStack.push(canvas.toDataURL("image/png"));
  if (undoStack.length > maxHistory) {
    undoStack.shift();
  }
  const snapshot = redoStack.pop();
  restoreFromDataUrl(snapshot);
  updateUndoRedoButtons();
});

brushButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const color = btn.dataset.color;
    const key = btn.dataset.key;
    const isSameActive = !isClickThrough && !isEraserMode && currentBrush === color;

    if (isSameActive) {
      disableDraftMode();
      return;
    }

    enableDraftMode(color, key);
  });
});

eraserBtn.addEventListener("click", () => {
  if (!isClickThrough && isEraserMode) {
    disableDraftMode();
    return;
  }
  enableEraserMode();
});

sizeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const nextSize = Number(btn.dataset.size);
    if (!Number.isFinite(nextSize)) {
      return;
    }
    brushSize = nextSize;
    sizeButtons.forEach((item) => {
      item.classList.toggle("active", item === btn);
    });
  });
});

canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", drawing);
window.addEventListener("mouseup", endDraw);
canvas.addEventListener("mouseleave", endDraw);
window.addEventListener("resize", syncCanvasSize);
window.addEventListener("mousemove", (event) => {
  if (!isClickThrough) {
    return;
  }
  const rect = toolbar.getBoundingClientRect();
  const inToolbar =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  window.desktopDraftAPI.setClickThrough(!inToolbar);
});
closeBtn.addEventListener("click", () => {
  window.desktopDraftAPI.closeWindow();
});

window.addEventListener("keydown", async (event) => {
  if (event.key === "Escape") {
    if (!isClickThrough) {
      event.preventDefault();
      pushUndoSnapshot();
      disableDraftMode({ clear: true });
    }
    return;
  }

  const key = event.key.toLowerCase();
  const hasCtrl = event.ctrlKey || event.metaKey;
  if (hasCtrl && key === "z" && !event.shiftKey) {
    event.preventDefault();
    undoBtn.click();
    return;
  }

  if ((hasCtrl && key === "y") || (hasCtrl && event.shiftKey && key === "z")) {
    event.preventDefault();
    redoBtn.click();
    return;
  }

  const isSave = hasCtrl && key === "s";
  if (isSave) {
    event.preventDefault();
    const dataUrl = exportCanvasWithWhiteBackground();
    const result = await window.desktopDraftAPI.saveImage(dataUrl, formatDefaultFileName());
    if (result?.ok) {
      showToast("保存成功");
    } else if (result && !result.canceled) {
      showToast(result.message || "保存失败");
    }
  }
});

function setClickThrough(nextState) {
  isClickThrough = nextState;
  canvas.classList.toggle("passthrough", nextState);
  window.desktopDraftAPI.setClickThrough(nextState);
}

updateUndoRedoButtons();
syncCanvasSize();
setClickThrough(true);
