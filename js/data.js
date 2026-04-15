/**
 * data.js — 数据模型 & 场景预设数据
 *
 * 数据结构：
 *   Signal { id, source: {block, signal}, net, target: {block, signal}, j1Pins: number[], j2Pins: number[], type }
 *   type: 'power' | 'data' | 'ground'
 */

// 全局可变状态
const AppState = {
  signals: [],
  nextPinId: 4,
  currentScene: 1,
  connGenerated: false,
};

// 各场景的预设数据
const SCENE_PRESETS = {
  // 场景 1 & 2：默认 1:1 Mapping
  default: [
    { id: 's1', source: { block: 'PSU', signal: 'VDD_5V' }, net: 'SYS_5V_POWER', target: { block: 'Load', signal: 'VDD_5V' }, j1Pins: [1], j2Pins: [1], type: 'power' },
    { id: 's2', source: { block: 'PSU', signal: 'DATA_TX' }, net: 'SYS_DATA_TX', target: { block: 'Load', signal: 'DATA_RX' }, j1Pins: [2], j2Pins: [2], type: 'data' },
    { id: 's3', source: { block: 'PSU', signal: 'GND' }, net: 'SYS_GND', target: { block: 'Load', signal: 'GND' }, j1Pins: [3], j2Pins: [3], type: 'ground' },
  ],
  // 场景 3：电源并线
  powerParallel: [
    { id: 's1', source: { block: 'PSU', signal: 'VDD_5V' }, net: 'SYS_5V_POWER', target: { block: 'Load', signal: 'VDD_5V' }, j1Pins: [1, 2], j2Pins: [1, 2], type: 'power' },
    { id: 's2', source: { block: 'PSU', signal: 'DATA_TX' }, net: 'SYS_DATA_TX', target: { block: 'Load', signal: 'DATA_RX' }, j1Pins: [3], j2Pins: [3], type: 'data' },
    { id: 's3', source: { block: 'PSU', signal: 'GND' }, net: 'SYS_GND', target: { block: 'Load', signal: 'GND' }, j1Pins: [4, 5, 6], j2Pins: [4, 5, 6], type: 'ground' },
  ],
};

// 场景描述配置
const SCENE_DESCRIPTIONS = {
  1: {
    title: '场景一：连线穿越 Board 边界，自动生成连接器',
    body: '用户先在画布上选择跨板线段（支持 Ctrl 多选），再右键对已选线执行创建/调整 Connector。<br/>系统只处理已选线，保持用户主导。',
    hint: '单击选线，Ctrl 多选，右键打开操作菜单',
  },
  2: {
    title: '场景二：默认 1:1 Mapping — 用户点开连线查看',
    body: '每个 Signal 默认分配 1 个 Pin，Total Pins 自动求和。<br/>这是最简状态 — 架构师可以先不管 Pin 分配，以后再细化。',
    hint: '注意每行右侧的 + 按钮 — 那是添加并联 Pin 的入口',
  },
  3: {
    title: '场景三：电源并线 — 用户给 VDD 和 GND 追加 Pin',
    body: 'VDD_5V 需要 2 个 Pin 并联走电流，GND 需要 3 个 Pin。<br/>用户通过 <strong>+</strong> 按钮逐个追加，Total Pins 实时更新为 6。每个 Pin Tag 可通过 × 移除。',
    hint: '试试给 VDD_5V 再加一个 Pin，或移除 GND 的一个 Pin',
  },
  4: {
    title: '场景四：拖拽调整信号顺序',
    body: '架构师想把 GND 排在最前面、VDD 排中间、数据线排最后。<br/>拖拽行左侧的 ⠿ 手柄即可调序，松手后 Pin 编号<strong>自动重排</strong>。',
    hint: '拖拽 GND 行到最上方试试',
  },
};

/**
 * 深拷贝预设数据，避免修改污染原始数据
 */
function clonePreset(key) {
  return JSON.parse(JSON.stringify(SCENE_PRESETS[key]));
}

/**
 * 加载场景数据到 AppState
 */
function loadSceneData(sceneNum) {
  if (sceneNum === 1 || sceneNum === 2) {
    AppState.signals = clonePreset('default');
    AppState.nextPinId = 4;
  } else if (sceneNum === 3 || sceneNum === 4) {
    AppState.signals = clonePreset('powerParallel');
    AppState.nextPinId = 7;
  }
}
