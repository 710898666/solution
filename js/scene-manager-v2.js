/**
 * scene-manager-v2.js — 场景切换 + 场景一右键创建连接器
 *
 * 依赖：data.js (AppState, loadSceneData, SCENE_DESCRIPTIONS), table-renderer.js (renderTable), toast.js (showToast)
 */

const INFO_ICON = '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z"/></svg>';
const SVG_NS = 'http://www.w3.org/2000/svg';

const SCENE1_SIGNALS = [
  { id: 'power', name: 'VDD_5V', type: 'power', sourceY: 97, targetY: 97, color: '#d29922', crossBoard: true },
  { id: 'data', name: 'DATA_TX/RX', type: 'data', sourceY: 113, targetY: 113, color: '#58a6ff', crossBoard: true },
  { id: 'ground', name: 'GND', type: 'ground', sourceY: 129, targetY: 129, color: '#8b949e', crossBoard: true },
];

const SIGNAL_TYPE_ORDER = {
  power: 1,
  ground: 2,
  data: 3,
};

const CONNECTOR_PAIRS = [
  { key: 'A', leftName: 'J1', rightName: 'J2', centerY: 60 },
  { key: 'B', leftName: 'J3', rightName: 'J4', centerY: 108 },
  { key: 'C', leftName: 'J5', rightName: 'J6', centerY: 154 },
];

const scene1State = {
  selected: [],
  assignments: {},
  draftAssignments: {},
  lastPointer: { x: 420, y: 220 },
};

let scene1EventsBound = false;

function renderSceneDesc(sceneNum) {
  const desc = document.getElementById('sceneDesc');
  const cfg = SCENE_DESCRIPTIONS[sceneNum];
  if (!cfg) return;

  desc.innerHTML = `
    <h2>${cfg.title}</h2>
    <p>${cfg.body}</p>
    <div class="hint">${INFO_ICON} ${cfg.hint}</div>
  `;
}

function switchScene(n) {
  AppState.currentScene = n;

  document.querySelectorAll('.scene-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.scene) === n);
  });

  const canvas = document.getElementById('canvasMockup');
  const panel = document.getElementById('mainPanel');
  const selectBar = document.getElementById('lineSelectBar');

  if (n === 1) {
    loadSceneData(1);
    AppState.connGenerated = false;
    resetScene1State();
    ensureScene1EventBindings();
    resetCanvas();

    canvas.style.display = 'block';
    panel.style.display = 'none';
    selectBar.style.display = 'flex';
    renderSceneDesc(1);
    return;
  }

  canvas.style.display = 'none';
  panel.style.display = 'block';
  selectBar.style.display = 'none';

  closeScene1ContextMenu();
  closeQuickCreate();
  hideBundlePanel();

  loadSceneData(n);
  renderSceneDesc(n);
  renderTable();
}

function resetScene1State() {
  scene1State.selected = [];
  scene1State.assignments = {};
  scene1State.draftAssignments = {};
  SCENE1_SIGNALS.forEach(sig => {
    scene1State.assignments[sig.id] = null;
    scene1State.draftAssignments[sig.id] = null;
  });
}

function hasAnyAssigned() {
  return Object.values(scene1State.assignments).some(Boolean);
}

function getSignalById(signalId) {
  return SCENE1_SIGNALS.find(s => s.id === signalId);
}

function ensureScene1EventBindings() {
  if (scene1EventsBound) return;

  const canvas = document.getElementById('canvasMockup');
  canvas.addEventListener('click', onScene1CanvasClick);
  canvas.addEventListener('contextmenu', onScene1CanvasContextMenu);

  document.addEventListener('click', onGlobalClick);
  document.addEventListener('keydown', onGlobalKeyDown);

  document.getElementById('quickCapacity').addEventListener('change', updateQuickPreview);
  document.getElementById('quickGroupMode').addEventListener('change', updateQuickPreview);

  scene1EventsBound = true;
}

function onScene1CanvasClick(evt) {
  if (AppState.currentScene !== 1) return;
  if (evt.target.closest('#scene1ContextMenu') || evt.target.closest('#scene1QuickPop')) return;

  const line = evt.target.closest('.route-line');
  if (!line) {
    if (!evt.ctrlKey && !evt.metaKey) clearScene1Selection();
    closeScene1ContextMenu();
    return;
  }

  const signalId = line.dataset.signal;
  scene1State.lastPointer = { x: evt.clientX, y: evt.clientY };
  updateScene1Selection(signalId, evt.ctrlKey || evt.metaKey);
  closeScene1ContextMenu();
}

function onScene1CanvasContextMenu(evt) {
  if (AppState.currentScene !== 1) return;
  const line = evt.target.closest('.route-line');
  if (!line) return;

  evt.preventDefault();
  const signalId = line.dataset.signal;

  if (!scene1State.selected.includes(signalId)) {
    scene1State.selected = [signalId];
  }

  scene1State.lastPointer = { x: evt.clientX, y: evt.clientY };
  updateSelectionUI();
  openScene1ContextMenu(evt.clientX, evt.clientY);
}

function onGlobalClick(evt) {
  if (AppState.currentScene !== 1) return;
  if (evt.target.closest('#scene1ContextMenu')) return;
  if (evt.target.closest('#scene1QuickPop')) return;
  closeScene1ContextMenu();
}

function onGlobalKeyDown(evt) {
  if (AppState.currentScene !== 1) return;
  if (evt.key !== 'Escape') return;
  closeScene1ContextMenu();
  closeQuickCreate();
}

function updateScene1Selection(signalId, multi) {
  if (!multi) {
    scene1State.selected = [signalId];
    updateSelectionUI();
    return;
  }

  const idx = scene1State.selected.indexOf(signalId);
  if (idx >= 0) {
    scene1State.selected.splice(idx, 1);
  } else {
    scene1State.selected.push(signalId);
  }
  updateSelectionUI();
}

function clearScene1Selection() {
  scene1State.selected = [];
  updateSelectionUI();
  closeScene1ContextMenu();
}

function updateSelectionUI() {
  updateSelectBarText();
  applySelectionStyles();
  updateQuickPreview();
}

function updateSelectBarText() {
  const text = document.getElementById('lineSelectText');
  const selectedCount = scene1State.selected.length;
  const crossBoardCount = scene1State.selected
    .map(getSignalById)
    .filter(sig => sig && sig.crossBoard)
    .length;
  text.textContent = `已选 ${selectedCount} 条线（跨板 ${crossBoardCount}）`;
}

function applySelectionStyles() {
  const selected = new Set(scene1State.selected);
  const hasSelection = selected.size > 0;

  document.querySelectorAll('#canvasMockup .route-line').forEach(el => {
    const isMatch = selected.has(el.dataset.signal);
    el.classList.toggle('is-active', hasSelection && isMatch);
    el.classList.toggle('is-muted', hasSelection && !isMatch);
  });

  document.querySelectorAll('#canvasMockup .pin-dot').forEach(el => {
    const isMatch = selected.has(el.dataset.signal);
    el.classList.toggle('is-active', hasSelection && isMatch);
    el.classList.toggle('is-muted', hasSelection && !isMatch);
  });
}

function openScene1ContextMenu(x, y) {
  const menu = document.getElementById('scene1ContextMenu');
  const hasSelectedAssigned = scene1State.selected.some(id => !!scene1State.assignments[id]);

  let html = '';
  html += `<button class="ctx-item" onclick="openQuickCreateFromSelection()">基于已选创建 Connector...</button>`;

  if (hasAnyAssigned()) {
    CONNECTOR_PAIRS.forEach(pair => {
      html += `<button class="ctx-item" onclick="moveSelectedToPair('${pair.key}')">移动已选线到 ${pair.leftName}/${pair.rightName}</button>`;
    });
    if (hasSelectedAssigned) {
      html += `<button class="ctx-item" onclick="detachSelectedFromConnector()">从 Connector 中移出已选线</button>`;
    }
    html += `<button class="ctx-item" onclick="switchScene(2)">查看 Pin Mapping</button>`;
  }

  html += `<button class="ctx-item" onclick="clearScene1Selection()">清空选择</button>`;

  menu.innerHTML = html;
  menu.style.display = 'block';

  const width = 250;
  const itemHeight = 34;
  const height = itemHeight * menu.querySelectorAll('.ctx-item').length + 8;
  const left = Math.max(12, Math.min(x + 8, window.innerWidth - width - 12));
  const top = Math.max(12, Math.min(y + 8, window.innerHeight - height - 12));

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function closeScene1ContextMenu() {
  const menu = document.getElementById('scene1ContextMenu');
  menu.style.display = 'none';
}

function openQuickCreateFromSelection() {
  if (scene1State.selected.length === 0) {
    showToast('未选择线段', '请先单击或 Ctrl 多选线段', 'warn');
    return;
  }

  closeScene1ContextMenu();
  const pop = document.getElementById('scene1QuickPop');

  const left = Math.max(12, Math.min(scene1State.lastPointer.x + 12, window.innerWidth - 320));
  const top = Math.max(12, Math.min(scene1State.lastPointer.y + 12, window.innerHeight - 220));
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
  pop.style.display = 'block';

  updateQuickPreview();
}

function closeQuickCreate() {
  document.getElementById('scene1QuickPop').style.display = 'none';
}

function updateQuickPreview() {
  const preview = document.getElementById('quickPreviewText');
  if (!preview) return;

  const cap = parseInt(document.getElementById('quickCapacity').value, 10);
  const mode = document.getElementById('quickGroupMode').value;
  const ordered = getSelectedSignalIds(mode);

  if (ordered.length === 0) {
    preview.textContent = '将按当前已选线创建连接器分组';
    return;
  }

  const pairCount = Math.ceil(ordered.length / cap);
  preview.textContent = `已选 ${ordered.length} 条线，预计生成 ${pairCount} 对 Connector`;
}

function getSelectedSignalIds(mode) {
  const selectedSet = new Set(scene1State.selected);
  const candidates = SCENE1_SIGNALS.filter(sig => selectedSet.has(sig.id));

  if (mode === 'type') {
    candidates.sort((a, b) => SIGNAL_TYPE_ORDER[a.type] - SIGNAL_TYPE_ORDER[b.type] || a.sourceY - b.sourceY);
    return candidates.map(sig => sig.id);
  }

  const indexMap = new Map();
  scene1State.selected.forEach((id, idx) => indexMap.set(id, idx));
  candidates.sort((a, b) => indexMap.get(a.id) - indexMap.get(b.id));
  return candidates.map(sig => sig.id);
}

function confirmQuickCreate() {
  const cap = Math.max(1, parseInt(document.getElementById('quickCapacity').value, 10));
  const mode = document.getElementById('quickGroupMode').value;
  const selectedIds = getSelectedSignalIds(mode);

  if (selectedIds.length === 0) {
    showToast('未选择线段', '请先选择线段再创建', 'warn');
    return;
  }

  applyAssignmentsForSelection(selectedIds, cap);
  closeQuickCreate();
}

function applyAssignmentsForSelection(selectedIds, capacity) {
  const selectedSet = new Set(selectedIds);

  selectedIds.forEach(id => {
    scene1State.assignments[id] = null;
  });

  const usedByOthers = new Set(
    Object.entries(scene1State.assignments)
      .filter(([id, pair]) => !selectedSet.has(id) && !!pair)
      .map(([, pair]) => pair)
  );

  let freePairs = CONNECTOR_PAIRS.filter(pair => !usedByOthers.has(pair.key));
  if (freePairs.length === 0) freePairs = CONNECTOR_PAIRS.slice();

  let chunkIdx = 0;
  for (let i = 0; i < selectedIds.length; i += capacity) {
    const chunk = selectedIds.slice(i, i + capacity);
    const pair = freePairs[Math.min(chunkIdx, freePairs.length - 1)];
    chunk.forEach(id => {
      scene1State.assignments[id] = pair.key;
    });
    chunkIdx++;
  }

  AppState.connGenerated = hasAnyAssigned();
  renderScene1Routing();
  syncDraftFromAssignments();
  showBundlePanel();
  updateSelectionUI();

  showToast('Connector 已创建', `已按已选线生成分组（${Math.ceil(selectedIds.length / capacity)} 组）`);
}

function moveSelectedToPair(pairKey) {
  if (scene1State.selected.length === 0) {
    showToast('未选择线段', '请先选择要移动的线段', 'warn');
    return;
  }

  scene1State.selected.forEach(id => {
    scene1State.assignments[id] = pairKey;
  });

  AppState.connGenerated = true;
  renderScene1Routing();
  syncDraftFromAssignments();
  showBundlePanel();
  updateSelectionUI();
  closeScene1ContextMenu();
  showToast('已完成分组调整', '已选线段已移动到目标 Connector');
}

function detachSelectedFromConnector() {
  if (scene1State.selected.length === 0) {
    showToast('未选择线段', '请先选择要移出的线段', 'warn');
    return;
  }

  scene1State.selected.forEach(id => {
    scene1State.assignments[id] = null;
  });

  AppState.connGenerated = hasAnyAssigned();
  renderScene1Routing();
  syncDraftFromAssignments();
  if (hasAnyAssigned()) showBundlePanel();
  else hideBundlePanel();

  updateSelectionUI();
  closeScene1ContextMenu();
  showToast('已移出连接器', '已选线段恢复为直接跨板连线');
}

function pairOptionsHTML(selectedKey, includeNone) {
  let html = '';
  if (includeNone) {
    html += `<option value="" ${!selectedKey ? 'selected' : ''}>直接跨板（无 Connector）</option>`;
  }
  CONNECTOR_PAIRS.forEach(pair => {
    html += `<option value="${pair.key}" ${selectedKey === pair.key ? 'selected' : ''}>${pair.leftName}/${pair.rightName}</option>`;
  });
  return html;
}

function renderBundleAssignList() {
  const host = document.getElementById('bundleAssignList');
  if (!host) return;

  host.innerHTML = SCENE1_SIGNALS.map(sig => `
    <div class="cfg-row">
      <span class="cfg-signal" style="color:${sig.color}">${sig.name}</span>
      <select class="cfg-select" onchange="onBundleAssignChange('${sig.id}', this.value)">
        ${pairOptionsHTML(scene1State.draftAssignments[sig.id], true)}
      </select>
    </div>
  `).join('');
}

function syncDraftFromAssignments() {
  scene1State.draftAssignments = { ...scene1State.assignments };
  renderBundleAssignList();
  updateBundleSummary();
}

function onBundleAssignChange(signalId, pairKey) {
  scene1State.draftAssignments[signalId] = pairKey || null;
}

function applyBundleAdjustment() {
  scene1State.assignments = { ...scene1State.draftAssignments };
  AppState.connGenerated = hasAnyAssigned();

  renderScene1Routing();
  if (hasAnyAssigned()) showBundlePanel();
  else hideBundlePanel();

  updateSelectionUI();
  showToast('分组已更新', 'Connector 分组调整已应用');
}

function updateBundleSummary() {
  const title = document.getElementById('bundleTitle');
  const meta = document.getElementById('bundleMeta');
  if (!title || !meta) return;

  const grouped = {};
  CONNECTOR_PAIRS.forEach(pair => { grouped[pair.key] = []; });

  const unassigned = [];
  SCENE1_SIGNALS.forEach(sig => {
    const pairKey = scene1State.assignments[sig.id];
    if (pairKey && grouped[pairKey]) grouped[pairKey].push(sig.name);
    else unassigned.push(sig.name);
  });

  const usedPairs = CONNECTOR_PAIRS.filter(pair => grouped[pair.key].length > 0);
  title.textContent = `已创建 ${usedPairs.length} 对 Connector`;

  const chunks = usedPairs.map(pair => `${pair.leftName}/${pair.rightName}: ${grouped[pair.key].join(' + ')}`);
  if (unassigned.length) chunks.push(`直连: ${unassigned.join(' + ')}`);
  meta.textContent = chunks.join('  |  ');
}

function showBundlePanel() {
  if (!hasAnyAssigned()) return;
  const panel = document.getElementById('bundlePanel');
  syncDraftFromAssignments();
  panel.style.display = 'block';
  requestAnimationFrame(() => panel.classList.add('visible'));
}

function hideBundlePanel() {
  const panel = document.getElementById('bundlePanel');
  panel.classList.remove('visible');
  setTimeout(() => {
    if (!panel.classList.contains('visible')) panel.style.display = 'none';
  }, 180);
}

function createSvgNode(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => {
    node.setAttribute(k, String(v));
  });
  return node;
}

function renderScene1Routing() {
  const wiresBefore = document.getElementById('wiresBefore');
  const bundleLayer = document.getElementById('bundleLayer');
  const wireLayer = document.getElementById('wireLayer');
  const connectorLayer = document.getElementById('connectorLayer');

  bundleLayer.innerHTML = '';
  wireLayer.innerHTML = '';
  connectorLayer.innerHTML = '';

  if (!hasAnyAssigned()) {
    wiresBefore.style.opacity = '1';
    wiresBefore.style.pointerEvents = 'auto';

    [bundleLayer, wireLayer, connectorLayer].forEach(layer => {
      layer.style.opacity = '0';
      layer.style.pointerEvents = 'none';
    });

    applySelectionStyles();
    return;
  }

  wiresBefore.style.opacity = '0';
  wiresBefore.style.pointerEvents = 'none';

  [bundleLayer, wireLayer, connectorLayer].forEach(layer => {
    layer.style.opacity = '1';
    layer.style.pointerEvents = 'auto';
  });

  const grouped = {};
  CONNECTOR_PAIRS.forEach(pair => { grouped[pair.key] = []; });
  SCENE1_SIGNALS.forEach(sig => {
    const pairKey = scene1State.assignments[sig.id];
    if (pairKey && grouped[pairKey]) grouped[pairKey].push(sig);
  });

  // 先绘制没有分配连接器的直连线
  SCENE1_SIGNALS.forEach(sig => {
    if (scene1State.assignments[sig.id]) return;
    const direct = createSvgNode('line', {
      class: `route-line signal-${sig.id}`,
      'data-signal': sig.id,
      x1: 200,
      y1: sig.sourceY,
      x2: 890,
      y2: sig.targetY,
      stroke: sig.color,
      'stroke-width': 1.5,
      opacity: 0.45,
    });
    wireLayer.appendChild(direct);
  });

  // 绘制连接器组
  CONNECTOR_PAIRS.forEach(pair => {
    const members = grouped[pair.key];
    if (!members.length) return;

    const orderedMembers = members.slice().sort((a, b) => a.sourceY - b.sourceY);
    const pinPitch = 14;
    const connectorHeight = 34 + (orderedMembers.length - 1) * pinPitch;
    const topY = pair.centerY - connectorHeight / 2;

    const leftRect = createSvgNode('rect', {
      x: 320, y: topY, width: 60, height: connectorHeight, rx: 4,
      fill: '#161b22', stroke: '#39d5cf', 'stroke-width': 1.5,
    });
    const rightRect = createSvgNode('rect', {
      x: 700, y: topY, width: 60, height: connectorHeight, rx: 4,
      fill: '#161b22', stroke: '#39d5cf', 'stroke-width': 1.5,
    });
    connectorLayer.appendChild(leftRect);
    connectorLayer.appendChild(rightRect);

    const leftLabel = createSvgNode('text', {
      x: 350, y: topY - 8, fill: '#39d5cf', 'font-family': 'JetBrains Mono, monospace',
      'font-size': 10, 'font-weight': 600, 'text-anchor': 'middle',
    });
    leftLabel.textContent = pair.leftName;
    connectorLayer.appendChild(leftLabel);

    const rightLabel = createSvgNode('text', {
      x: 730, y: topY - 8, fill: '#39d5cf', 'font-family': 'JetBrains Mono, monospace',
      'font-size': 10, 'font-weight': 600, 'text-anchor': 'middle',
    });
    rightLabel.textContent = pair.rightName;
    connectorLayer.appendChild(rightLabel);

    let minCableY = 999;
    let maxCableY = 0;

    orderedMembers.forEach((sig, idx) => {
      const pinY = topY + 17 + idx * pinPitch;
      minCableY = Math.min(minCableY, pinY);
      maxCableY = Math.max(maxCableY, pinY);

      [325, 375, 705, 755].forEach(x => {
        const dot = createSvgNode('circle', {
          class: `pin-dot signal-${sig.id}`,
          'data-signal': sig.id,
          cx: x, cy: pinY, r: 2.6, fill: '#58a6ff',
        });
        connectorLayer.appendChild(dot);
      });

      const leftLine = createSvgNode('line', {
        class: `route-line signal-${sig.id}`,
        'data-signal': sig.id,
        x1: 200, y1: sig.sourceY, x2: 325, y2: pinY,
        stroke: sig.color, 'stroke-width': 1.5, opacity: 0.82,
      });
      wireLayer.appendChild(leftLine);

      const cableLine = createSvgNode('line', {
        class: `route-line signal-${sig.id}`,
        'data-signal': sig.id,
        x1: 375, y1: pinY, x2: 705, y2: pinY,
        stroke: sig.color, 'stroke-width': 1.2, 'stroke-dasharray': '6 4', opacity: 0.68,
      });
      wireLayer.appendChild(cableLine);

      const rightLine = createSvgNode('line', {
        class: `route-line signal-${sig.id}`,
        'data-signal': sig.id,
        x1: 755, y1: pinY, x2: 890, y2: sig.targetY,
        stroke: sig.color, 'stroke-width': 1.5, opacity: 0.82,
      });
      wireLayer.appendChild(rightLine);
    });

    const shellY = minCableY - 10;
    const shellH = Math.max(20, maxCableY - minCableY + 20);
    const bundleShell = createSvgNode('rect', {
      x: 375, y: shellY, width: 330, height: shellH, rx: Math.min(22, shellH / 2),
      fill: 'rgba(57, 213, 207, 0.08)', stroke: '#39d5cf', 'stroke-width': 1, 'stroke-dasharray': '6 4',
    });
    bundleLayer.appendChild(bundleShell);

    const bundleLabel = createSvgNode('text', {
      x: 540, y: shellY - 4, fill: '#39d5cf', 'font-family': 'JetBrains Mono, monospace',
      'font-size': 10, 'text-anchor': 'middle',
    });
    bundleLabel.textContent = `Bundle_${pair.leftName}_${pair.rightName} · ${orderedMembers.length} Signals`;
    bundleLayer.appendChild(bundleLabel);
  });

  applySelectionStyles();
}

function resetCanvas() {
  document.getElementById('clickHint').textContent = '单击选线，Ctrl 多选，右键创建/调整 Connector';
  closeScene1ContextMenu();
  closeQuickCreate();
  hideBundlePanel();
  clearScene1Selection();
  renderScene1Routing();
}

// 兼容老入口：如果外部仍调用，转成当前主流程
function triggerConnectorGen() {
  openQuickCreateFromSelection();
}
