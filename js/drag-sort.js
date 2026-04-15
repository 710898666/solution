/**
 * drag-sort.js — 行拖拽排序
 *
 * 依赖：data.js (AppState), pin-manager.js (renumberPins), table-renderer.js (renderTable), toast.js (showToast)
 */

let dragSrcId = null;

function onDragStart(e) {
  dragSrcId = this.dataset.id;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const rect = this.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  this.classList.remove('drag-over-top', 'drag-over-bottom');
  if (e.clientY < midY) {
    this.classList.add('drag-over-top');
  } else {
    this.classList.add('drag-over-bottom');
  }
}

function onDragLeave() {
  this.classList.remove('drag-over-top', 'drag-over-bottom');
}

function onDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over-top', 'drag-over-bottom');

  const targetId = this.dataset.id;
  if (dragSrcId === targetId) return;

  const srcIdx = AppState.signals.findIndex(s => s.id === dragSrcId);
  const tgtIdx = AppState.signals.findIndex(s => s.id === targetId);

  const [moved] = AppState.signals.splice(srcIdx, 1);
  const rect = this.getBoundingClientRect();
  const insertIdx = e.clientY < rect.top + rect.height / 2 ? tgtIdx : tgtIdx + (srcIdx < tgtIdx ? 0 : 1);
  AppState.signals.splice(insertIdx, 0, moved);

  renumberPins();
  renderTable();

  showToast('顺序已调整', 'Pin 编号已自动重排');
}

function onDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
    el.classList.remove('drag-over-top', 'drag-over-bottom');
  });
}
