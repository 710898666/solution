/**
 * app.js — 应用入口
 *
 * 加载顺序（由 index.html 保证）：
 *   1. data.js       — 数据模型 & 状态
 *   2. toast.js      — Toast 通知（无依赖）
 *   3. pin-manager.js — Pin 操作（依赖 data, toast, table-renderer）
 *   4. table-renderer.js — 表格渲染（依赖 data, pin-manager, drag-sort）
 *   5. drag-sort.js  — 拖拽排序（依赖 data, pin-manager, table-renderer, toast）
 *   6. scene-manager-v2.js — 场景管理（依赖 data, table-renderer, toast）
 *   7. app.js        — 入口（依赖以上全部）
 */

// 初始化：默认进入场景 1
switchScene(1);
