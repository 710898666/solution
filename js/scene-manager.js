/**
 * scene-manager.js — 场景切换 + 场景一右键创建连接器
 *
 * 依赖：data.js (AppState, loadSceneData, SCENE_DESCRIPTIONS), table-renderer.js (renderTable), toast.js (showToast)
 */

// SVG info 图标（用于 hint 区域）
const INFO_ICON = '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z"/></svg>';
const SVG_NS = 'http://www.w3.org/2000/svg';

const SCENE1_SIGNALS = [
  { id: 'power', name: 'VDD_5V', sourceY: 97, targetY: 97, color: '#d29922' },
  { id: 'data', name: 'DATA_TX/RX', sourceY: 113, targetY: 113, color: '#58a6ff' },
  { id: 'ground', name: 'GND', sourceY: 129, targetY: 129, color: '#8b949e' },
];

const CONNECTOR_PAIRS = [
  { key: 'A', leftName: 'J1', rightName: 'J2', centerY: 60 },
  { key: 'B', leftName: 'J3', rightName: 'J4', centerY: 108 },
  { key: 'C', leftName: 'J5', rightName: 'J6', centerY: 154 },
];

const BUNDLE_SIGNALS = SCENE1_SIGNALS.map(s => s.id);

const scene1ConnectorState = {
  capacity: 3,
  assignments: {},
  draftAssignments: {},
};

/**
 * 渲染场景描述区域
 */
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

/**
 * 切换场景
 */
function switchScene(n) {
  AppState.currentScene = n;

  // 更新导航按钮状态
  document.querySelectorAll('.scene-btn').forEach(b =>
    b.classList.toggle('active', parseInt(b.dataset.scene) === n)
  );

  const canvas = document.getElementById('canvasMockup');
  const panel = document.getElementById('mainPanel');

  if (n === 1) {
    // 场景 1：画布模式
    loadSceneData(1);
    AppState.connGenerated = false;
    resetScene1ConnectorState();
    resetCanvas();
    canvas.style.display = 'block';
    panel.style.display = 'none';
    renderSceneDesc(1);
    return;
  }

  // 场景 2/3/4：表格模式
  canvas.style.display = 'none';
  panel.style.display = 'block';
  hideConnectorConfigPanel();
  hideBundlePanel();
  loadSceneData(n);
  renderSceneDesc(n);
  renderTable();
}

// ==================== Scene 1 Connector Grouping ====================

function resetScene1ConnectorState() {
  scene1ConnectorState.capacity = 3;
  scene1ConnectorState.assignments = computeAutoAssignments(3);
  scene1ConnectorState.draftAssignments = { ...scene1ConnectorState.assignments };
}

function computeAutoAssignments(capacity) {
  const assignments = {};
  SCENE1_SIGNALS.forEach((sig, idx) => {
    const pairIdx = Math.min(Math.floor(idx / capacity), CONNECTOR_PAIRS.length - 1);
    assignments[sig.id] = CONNECTOR_PAIRS[pairIdx].key;
  });
  return assignments;
}

function getSignalsByPair(assignments) {
  const grouped = {};
  CONNECTOR_PAIRS.forEach(p => { grouped[p.key] = []; });
  SCENE1_SIGNALS.forEach(sig => {
    const pairKey = assignments[sig.id];
    if (grouped[pairKey]) grouped[pairKey].push(sig);
  });
  return grouped;
}

function pairOptionHTML(selectedKey) {
  return CONNECTOR_PAIRS.map(pair =>
    `<option value="${pair.key}" ${selectedKey === pair.key ? 'selected' : ''}>${pair.leftName}/${pair.rightName}</option>`
  ).join('');
}

function renderConfigSignalList() {
  const host = document.getElementById('configSignalList');
  if (!host) return;

  host.innerHTML = SCENE1_SIGNALS.map(sig => `
    <div class="cfg-row">
      <span class="cfg-signal" style="color:${sig.color}">${sig.name}</span>
      <select class="cfg-select" onchange="onConfigAssignChange('${sig.id}', this.value)">
        ${pairOptionHTML(scene1ConnectorState.draftAssignments[sig.id])}
      </select>
    </div>
  `).join('');
}

function renderBundleAssignList() {
  const host = document.getElementById('bundleAssignList');
  if (!host) return;

  host.innerHTML = SCENE1_SIGNALS.map(sig => `
    <div class="cfg-row">
      <span class="cfg-signal" style="color:${sig.color}">${sig.name}</span>
      <select class="cfg-select" onchange="onBundleAssignChange('${sig.id}', this.value)">
        ${pairOptionHTML(scene1ConnectorState.draftAssignments[sig.id])}
      </select>
    </div>
  `).join('');
}

function syncCapacityButtons() {
  document.querySelectorAll('#capacityButtons .cap-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.capacity) === scene1ConnectorState.capacity);
  });
}

function selectCapacity(capacity) {
  scene1ConnectorState.capacity = capacity;
  scene1ConnectorState.draftAssignments = computeAutoAssignments(capacity);
  syncCapacityButtons();
  renderConfigSignalList();
}

function applyAutoGrouping() {
  scene1ConnectorState.draftAssignments = computeAutoAssignments(scene1ConnectorState.capacity);
  renderConfigSignalList();
  showToast('已按容量重排', `当前规则：每对 Connector ${scene1ConnectorState.capacity} 根线`);
}

function onConfigAssignChange(signalId, pairKey) {
  scene1ConnectorState.draftAssignments[signalId] = pairKey;
}

function onBundleAssignChange(signalId, pairKey) {
  scene1ConnectorState.draftAssignments[signalId] = pairKey;
}

function showConnectorConfigPanel() {
  const panel = document.getElementById('connectorConfigPanel');
  if (!panel) return;
  panel.style.display = 'block';
  syncCapacityButtons();
  renderConfigSignalList();
}

function hideConnectorConfigPanel() {
  const panel = document.getElementById('connectorConfigPanel');
  if (!panel) return;
  panel.style.display = 'none';
}

function createSvgNode(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, String(v)));
  return node;
}

function renderConnectorRouting(assignments) {
  const connectorLayer = document.getElementById('connectorLayer');
  const wireLayer = document.getElementById('wireLayer');
  const bundleLayer = document.getElementById('bundleLayer');
  if (!connectorLayer || !wireLayer || !bundleLayer) return;

  connectorLayer.innerHTML = '';
  wireLayer.innerHTML = '';
  bundleLayer.innerHTML = '';

  const grouped = getSignalsByPair(assignments);

  CONNECTOR_PAIRS.forEach(pair => {
    const members = grouped[pair.key];
    if (!members || members.length === 0) return;

    const pinPitch = 14;
    const connectorHeight = 34 + (members.length - 1) * pinPitch;
    const topY = pair.centerY - connectorHeight / 2;

    // Connector bodies
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

    members.forEach((sig, idx) => {
      const pinY = topY + 17 + idx * pinPitch;
      minCableY = Math.min(minCableY, pinY);
      maxCableY = Math.max(maxCableY, pinY);

      // Pins
      [325, 375, 705, 755].forEach(x => {
        const dot = createSvgNode('circle', {
          class: `pin-dot signal-${sig.id}`,
          'data-signal': sig.id,
          cx: x, cy: pinY, r: 2.6, fill: '#58a6ff',
        });
        connectorLayer.appendChild(dot);
      });

      // Source -> connector
      const line1 = createSvgNode('line', {
        class: `route-line signal-${sig.id}`,
        'data-signal': sig.id,
        onclick: `focusBundleSignal('${sig.id}')`,
        x1: 200, y1: sig.sourceY, x2: 325, y2: pinY,
        stroke: sig.color, 'stroke-width': 1.5, opacity: 0.82,
      });
      wireLayer.appendChild(line1);

      // Cable segment
      const line2 = createSvgNode('line', {
        class: `route-line signal-${sig.id}`,
        'data-signal': sig.id,
        onclick: `focusBundleSignal('${sig.id}')`,
        x1: 375, y1: pinY, x2: 705, y2: pinY,
        stroke: sig.color, 'stroke-width': 1.2, 'stroke-dasharray': '6 4', opacity: 0.68,
      });
      wireLayer.appendChild(line2);

      // Connector -> target
      const line3 = createSvgNode('line', {
        class: `route-line signal-${sig.id}`,
        'data-signal': sig.id,
        onclick: `focusBundleSignal('${sig.id}')`,
        x1: 755, y1: pinY, x2: 890, y2: sig.targetY,
        stroke: sig.color, 'stroke-width': 1.5, opacity: 0.82,
      });
      wireLayer.appendChild(line3);
    });

    // Bundle envelope
    const shellY = minCableY - 10;
    const shellH = Math.max(20, maxCableY - minCableY + 20);
    const shell = createSvgNode('rect', {
      x: 375, y: shellY, width: 330, height: shellH, rx: Math.min(22, shellH / 2),
      fill: 'rgba(57, 213, 207, 0.08)', stroke: '#39d5cf', 'stroke-width': 1, 'stroke-dasharray': '6 4',
    });
    bundleLayer.appendChild(shell);

    const bundleLabel = createSvgNode('text', {
      x: 540, y: shellY - 4, fill: '#39d5cf', 'font-family': 'JetBrains Mono, monospace',
      'font-size': 10, 'text-anchor': 'middle',
    });
    bundleLabel.textContent = `Bundle_${pair.leftName}_${pair.rightName} · ${members.length} Signals`;
    bundleLayer.appendChild(bundleLabel);
  });
}

function updateBundleSummary() {
  const title = document.getElementById('bundleTitle');
  const meta = document.getElementById('bundleMeta');
  if (!title || !meta) return;

  const grouped = getSignalsByPair(scene1ConnectorState.assignments);
  const nonEmpty = CONNECTOR_PAIRS.filter(pair => grouped[pair.key].length > 0);

  title.textContent = `已创建 ${nonEmpty.length} 对 Connector，可继续调整信号归组`;
  const details = nonEmpty.map(pair => {
    const names = grouped[pair.key].map(sig => sig.name).join(' + ');
    return `${pair.leftName}/${pair.rightName}: ${names}`;
  }).join('  |  ');
  meta.textContent = details || '暂无分组';
}

function syncBundleDraftFromAssignments() {
  scene1ConnectorState.draftAssignments = { ...scene1ConnectorState.assignments };
  renderBundleAssignList();
  updateBundleSummary();
}

/**
 * 触发连接器创建入口
 */
function triggerConnectorGen() {
  if (AppState.connGenerated) {
    showBundlePanel();
    focusBundleSignal();
    showToast('连接器已创建', '你可以在下方面板继续调整信号归组');
    return;
  }
  showConnectorConfigPanel();
}

function confirmConnectorCreation() {
  AppState.connGenerated = true;
  scene1ConnectorState.assignments = { ...scene1ConnectorState.draftAssignments };
  hideConnectorConfigPanel();

  document.getElementById('wiresBefore').style.opacity = '0';
  document.getElementById('clickHint').style.opacity = '0';
  renderConnectorRouting(scene1ConnectorState.assignments);

  setTimeout(() => {
    document.getElementById('connectorLayer').style.opacity = '1';
    document.getElementById('wireLayer').style.opacity = '1';
    document.getElementById('wireLayer').style.pointerEvents = 'auto';
    document.getElementById('connectorLayer').style.pointerEvents = 'auto';
    document.getElementById('bundleLayer').style.opacity = '1';
    showBundlePanel();
    syncBundleDraftFromAssignments();
    focusBundleSignal();
  }, 180);

  setTimeout(() => {
    document.getElementById('clickHint').textContent = '线已分组到 Connector，可在下方面板调整并重新应用';
    document.getElementById('clickHint').style.opacity = '0.6';
  }, 460);

  const grouped = getSignalsByPair(scene1ConnectorState.assignments);
  const pairCount = CONNECTOR_PAIRS.filter(pair => grouped[pair.key].length > 0).length;
  showToast('连接器已创建', `共 ${pairCount} 对 Connector，可继续调整`);
}

function applyBundleAdjustment() {
  const before = JSON.stringify(scene1ConnectorState.assignments);
  const after = JSON.stringify(scene1ConnectorState.draftAssignments);
  if (before === after) {
    showToast('无需更新', '当前分组没有变化', 'warn');
    return;
  }

  scene1ConnectorState.assignments = { ...scene1ConnectorState.draftAssignments };
  renderConnectorRouting(scene1ConnectorState.assignments);
  updateBundleSummary();
  focusBundleSignal();
  showToast('分组已更新', 'Connector 组合和连线已同步刷新');
}

/**
 * 重置画布到初始状态
 */
function resetCanvas() {
  document.getElementById('wiresBefore').style.opacity = '1';
  ['bundleLayer', 'wireLayer', 'connectorLayer'].forEach(id => {
    const layer = document.getElementById(id);
    layer.style.opacity = '0';
    layer.style.pointerEvents = 'none';
    layer.innerHTML = '';
  });
  document.getElementById('clickHint').textContent = '← 点击连线区域，先配置再创建 Connector →';
  document.getElementById('clickHint').style.opacity = '0.6';
  hideConnectorConfigPanel();
  hideBundlePanel();
  focusBundleSignal();
}

/**
 * 展示场景 1 的解释卡片
 */
function showBundlePanel() {
  const panel = document.getElementById('bundlePanel');
  if (!panel) return;
  syncBundleDraftFromAssignments();
  panel.style.display = 'block';
  requestAnimationFrame(() => panel.classList.add('visible'));
}

/**
 * 隐藏场景 1 的解释卡片
 */
function hideBundlePanel() {
  const panel = document.getElementById('bundlePanel');
  if (!panel) return;
  panel.classList.remove('visible');
  setTimeout(() => {
    if (!panel.classList.contains('visible')) panel.style.display = 'none';
  }, 200);
}

/**
 * 高亮某一类信号及其对应连接器 Pin
 */
function focusBundleSignal(signalType) {
  const isSpecific = BUNDLE_SIGNALS.includes(signalType);

  document.querySelectorAll('#canvasMockup .route-line').forEach(el => {
    const matched = !isSpecific || el.dataset.signal === signalType;
    el.classList.toggle('is-active', isSpecific && matched);
    el.classList.toggle('is-muted', isSpecific && !matched);
  });

  document.querySelectorAll('#canvasMockup .pin-dot').forEach(el => {
    const matched = !isSpecific || el.dataset.signal === signalType;
    el.classList.toggle('is-active', isSpecific && matched);
    el.classList.toggle('is-muted', isSpecific && !matched);
  });

  document.querySelectorAll('#bundlePanel .bundle-sig').forEach(btn => {
    const btnSignal = btn.dataset.signal;
    const active = isSpecific ? btnSignal === signalType : !btnSignal;
    btn.classList.toggle('active', active);
  });
}
