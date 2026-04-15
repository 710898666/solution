/**
 * pin-manager.js — Pin 增删与重排逻辑
 *
 * 依赖：data.js (AppState), toast.js (showToast), table-renderer.js (renderTable)
 */

/**
 * 计算当前所有信号占用的总 Pin 数
 */
function getTotalPins() {
  return AppState.signals.reduce((sum, s) => sum + s.j1Pins.length, 0);
}

/**
 * 查找下一个可用的 Pin 编号（填充空洞）
 */
function getNextAvailablePin() {
  const used = new Set(AppState.signals.flatMap(s => s.j1Pins));
  let pin = 1;
  while (used.has(pin)) pin++;
  return pin;
}

/**
 * 从第一个信号开始连续重排所有 Pin 编号
 * J1 和 J2 保持对称
 */
function renumberPins() {
  let n = 1;
  AppState.signals.forEach(s => {
    const count = s.j1Pins.length;
    s.j1Pins = [];
    s.j2Pins = [];
    for (let i = 0; i < count; i++) {
      s.j1Pins.push(n);
      s.j2Pins.push(n);
      n++;
    }
  });
  AppState.nextPinId = n;
}

/**
 * 为指定信号追加一个并联 Pin
 */
function addPin(sigId) {
  const sig = AppState.signals.find(s => s.id === sigId);
  if (!sig) return;

  const newPin = AppState.nextPinId++;
  sig.j1Pins.push(newPin);
  sig.j2Pins.push(newPin);

  renumberPins();
  renderTable();

  showToast(
    'Pin 已追加',
    `${sig.source.signal} 现在占用 ${sig.j1Pins.length} 个 Pin（联动 J1/J2）`
  );
}

/**
 * 移除指定信号的某个 Pin（至少保留 1 个）
 */
function removePin(sigId, pinNum) {
  const sig = AppState.signals.find(s => s.id === sigId);
  if (!sig || sig.j1Pins.length <= 1) {
    showToast('无法移除', '每个信号至少保留 1 个 Pin', 'warn');
    return;
  }

  sig.j1Pins = sig.j1Pins.filter(p => p !== pinNum);
  sig.j2Pins = sig.j2Pins.filter(p => p !== pinNum);

  renumberPins();
  renderTable();

  showToast(
    'Pin 已移除',
    `${sig.source.signal} 现在占用 ${sig.j1Pins.length} 个 Pin`
  );
}
