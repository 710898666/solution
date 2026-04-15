# 框图设计工具 — 项目上下文

## 产品定位

框图设计工具是系统级硬件架构设计工具，位于传统 EDA 工具（Altium、Cadence）的上游。架构师通过 Block Diagram + 接口契约表达设计意图，输出 Design Intent Package（DIP）给下游消费。

**不是**原理图工具、PCB 工具、Visio。**是**结构化设计意图表达与传递平台。

## 核心数据模型

```
Block → Port → Signal → Pin（四层模型）
```

- Port ≠ Signal，必须显式区分（P2 原则）
- 器件导入经两次汇聚：Pin→Signal→Port
- 未识别 Pin 自动 1:1 升格为同名 Signal

## 技术栈

- Vue 3 (Composition API) + TypeScript + Vite
- 画布引擎：基于 `@antv/g` 底层 Canvas API 自建（gScope），**不用 G6**
- 状态管理：`editorInst` 单例 + `cellStateManager` + EventBus 驱动（非 Pinia 为主）
- CSS：Less
- UI 库：`@plmcsdk/common-ui` + `@plmhdp/base-components-sdk`（内部 SDK）

## 项目结构

```
src/modules/solution/     ← 框图编辑器（主要工作目录）
src/modules/hscope/       ← 主模块（首页等）
src/modules/sketch/       ← 草图模块
src/shared/               ← 公共层
```

## 设计原则（违反时需主动提醒）

- P1: 结构一致性优先 — 不为单个功能打破数据结构
- P2: Port 与 Signal 显式区分
- P3: 单向导出 DIP + 可选反向校验，不做实时双向同步
- P4: CBB 默认泛型矩形
- P5: 页面级 JSON + sharedBlockId 同步引擎
- P6: Annotation 元素页面级，不跨页
- P7: 组件面板双区设计

## 编码规范

- 组件使用 `<script setup lang="ts">` + Composition API
- 通知消息使用 `Message.success/error/warning`（来自 `@plmcsdk/common-ui`）
- 编辑操作需包裹在 `HISTORY.START_RECORD / END_RECORD` 中
- 写操作完成后触发 `editorBus.emit(REFRESH_DATA)`
- 新增元素需通过 `registerElement(type, Constructor)` 注册

## Skills

详细信息见 `.claude/skills/`：
- `block-design-tool-context` — 完整产品上下文与设计原则
- `solution-codebase` — 代码结构、画布引擎、API 接口、类型定义
