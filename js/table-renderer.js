/**
 * table-renderer.js — Pin Mapping 表格渲染
 *
 * 依赖：data.js (AppState), pin-manager.js (getTotalPins), drag-sort.js (绑定拖拽事件)
 */

// SVG 图标常量
const ICONS = {
  dragHandle: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 3a1 1 0 100 2 1 1 0 000-2zm5 0a1 1 0 100 2 1 1 0 000-2zm-5 4a1 1 0 100 2 1 1 0 000-2zm5 0a1 1 0 100 2 1 1 0 000-2zm-5 4a1 1 0 100 2 1 1 0 000-2zm5 0a1 1 0 100 2 1 1 0 000-2z"/></svg>',
  addPin: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/></svg>',
  removePin: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/></svg>',
};

// 信号类型 → 颜色映射
const TYPE_COLORS = {
  power: 'var(--accent-orange)',
  ground: 'var(--text-muted)',
  data: 'var(--accent-blue)',
};

/**
 * 生成单个 Pin Tag 的 HTML
 * @param {string} sigId - 所属信号 ID
 * @param {number} pinNum - Pin 编号
 * @param {'j1'|'j2'} side - J1 侧可移除，J2 侧只读
 */
function pinTagHTML(sigId, pinNum, side) {
  const removable = side === 'j1';
  return `<span class="pin-tag">
    Pin ${pinNum}
    ${removable ? `<span class="pin-remove" onclick="removePin('${sigId}', ${pinNum})">
      ${ICONS.removePin}
    </span>` : ''}
  </span>`;
}

/**
 * 渲染整个 Pin Mapping 表格
 */
function renderTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  AppState.signals.forEach((sig, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.id = sig.id;
    tr.draggable = true;

    // 绑定拖拽事件（来自 drag-sort.js）
    tr.addEventListener('dragstart', onDragStart);
    tr.addEventListener('dragover', onDragOver);
    tr.addEventListener('dragleave', onDragLeave);
    tr.addEventListener('drop', onDrop);
    tr.addEventListener('dragend', onDragEnd);

    const typeColor = TYPE_COLORS[sig.type] || TYPE_COLORS.data;

    tr.innerHTML = `
      <td>
        <div class="drag-handle">${ICONS.dragHandle}</div>
      </td>
      <td>
        <div class="signal-cell">
          <span class="block-name">${sig.source.block}.</span><span class="signal-name" style="color:${typeColor}">${sig.source.signal}</span>
        </div>
      </td>
      <td><span class="net-cell">${sig.net}</span></td>
      <td>
        <div class="pins-cell" id="j1-${sig.id}">
          ${sig.j1Pins.map(p => pinTagHTML(sig.id, p, 'j1')).join('')}
          <button class="pin-add-btn" title="添加并联 Pin" onclick="addPin('${sig.id}')">
            ${ICONS.addPin}
          </button>
        </div>
      </td>
      <td class="cable-cell">━ ━ ━</td>
      <td>
        <div class="pins-cell" id="j2-${sig.id}">
          ${sig.j2Pins.map(p => pinTagHTML(sig.id, p, 'j2')).join('')}
        </div>
      </td>
      <td>
        <div class="signal-cell">
          <span class="block-name">${sig.target.block}.</span><span class="signal-name" style="color:${typeColor}">${sig.target.signal}</span>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // 更新汇总信息
  document.getElementById('totalPinCount').textContent = getTotalPins();
  const idleCount = 0; // 未指定型号时无固定空闲 Pin
  document.getElementById('idleInfo').textContent = `空闲 Pin: ${idleCount}`;
}
