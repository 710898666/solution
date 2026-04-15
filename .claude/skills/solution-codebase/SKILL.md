---
name: solution-codebase
description: 框图设计工具前端 solution 模块的代码结构、技术栈、画布引擎机制、编辑器操作逻辑和 API 接口。当用户讨论 solution 模块的代码开发、Bug 修复、功能实现、重构、或任何涉及框图编辑器画布交互/元素操作/API 调用的具体编码任务时，必须先读取此 Skill。触发场景包括：用户提到"solution 模块"、"编辑器代码"、"画布"、"gScope"、"Block/Port/Wire 代码实现"、"addLine"、"copy/paste"、"元素操作"、"API 接口实现"，或者说"帮我改这个文件"、"这段代码怎么改"等涉及框图工具具体编码的请求。注意：此 Skill 覆盖代码实现层面，产品概念和设计原则请参考 block-design-tool-context Skill。
---

# Solution 模块代码上下文

> 本 Skill 为 Claude 提供框图设计工具前端 solution 模块的代码结构和实现细节，用于指导具体开发任务。产品层面的概念定义和设计原则见 `block-design-tool-context` Skill。

---

## 1. 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Vue 3 (Composition API) | 3.5.13 |
| 构建 | Vite | 4.3.9 |
| 语言 | TypeScript | 5.0.4 |
| 状态管理 | Pinia | 2.1.7 |
| 路由 | vue-router | 4.4.0 |
| HTTP | axios | 1.13.5 |
| CSS | Less | 4.1.3 |
| 画布渲染 | @antv/g (底层渲染器，非 G6) | 6.3.1 (overrides) |
| UI 组件库 | @plmcsdk/common-ui + @plmhdp/base-components-sdk | 内部 SDK |
| 工具库 | @vueuse/core | 10.5.0 |
| 国际化 | vue-i18n | 9.14.5 |

**关键区分**：`package.json` 中有 `@antv/g6: 5.0.49`，但 solution 模块的画布引擎**不用 G6**，直接基于 `@antv/g` 底层 Canvas API 构建。G6 用于项目中其他拓扑可视化场景。

---

## 2. 模块架构分层

```
Views（视图层）─ editor/ | manager/ | preview/
    │
Components（组件层）─ flexForm | splitLayout | contextMenu | colorPicker ...
    │
Utils（工具层）─ elementLib | gScope（画布引擎）| loader | nameDeduplicator
    │
API（接口层）─ block | cbb | page | port | project | task | share | pageCheck
    │
Shared（共享层）─ xhr | types | utils（项目级公共）
```

---

## 3. 画布引擎 gScope — 核心机制

gScope 是 solution 模块自建的轻量画布引擎，直接基于 `@antv/g` 构建。

### 3.1 初始化流程

1. `gVisual.vue` 在 `onMounted` 中调用 `visual.init(container)`
2. `gVisualSetup.ts` 创建 `Renderer`（`@antv/g-canvas`，关闭自动渲染）
3. 创建 `G.Canvas` 实例，等待 `canvas.ready`
4. 启动 `requestAnimationFrame` 循环手动调用 `canvas.render()`

### 3.2 元素体系

所有画布元素继承自 `BaseElement<Props, Style>`：

| 属性 | 类型 | 说明 |
|------|------|------|
| `displayObject` | `G.DisplayObject` | AntV G 底层 Shape 实例 |
| `children` | `BaseElement[]` | 子元素（业务层树结构） |
| `parent` | `BaseElement \| undefined` | 父元素引用 |
| `anchors` | `{ direction, constraint }[]` | 连接锚点 |

**元素类型**：Block、Port、Wire、Text、Board、Graph（根容器）

### 3.3 元素注册与反序列化

```
elementMap: Record<string, Constructor>  // type → 构造函数映射
registerElement(type, Constructor)       // 注册新类型
load(json) → 根据 json.type 查 elementMap → new 实例 → 递归 children → displayObject.appendChild
```

### 3.4 事件总线 visualBus

| 事件 | 说明 |
|------|------|
| `HOVER_CHANGED` | hover 目标变化 |
| `SELECT_CHANGED` | 选中元素变化 |
| `HISTORY.START_RECORD` | 开始记录撤销历史 |
| `HISTORY.END_RECORD` | 结束记录 |
| `HISTORY.RECORD` | 记录单次操作 |

> 来源：`@plmcsdk/js-utility-library` 的 EventBus

### 3.5 编辑器事件总线 editorBus

| 事件 | 说明 |
|------|------|
| `SET_ACTION` | 设置当前操作模式 |
| `SWITCH_PAGE` | 切换页面 |
| `UPDATE_URL` | 更新 URL |
| `REFRESH_DATA` | 刷新数据（几乎所有写操作结束后都会触发） |
| `PAGE_CONTEXT_MENU` | 打开右键菜单 |

> visualBus 管画布级事件（hover/select/history），editorBus 管业务级事件（页面切换/数据刷新）。

---

## 4. 编辑器核心操作

### 4.1 创建连线 (`addLine.ts`)

```
addLine({ source: Port, target: Port, points: Point[] })
→ 自动设置端口方向(OUT/IN) → new Wire() → graph.add(line) → 刷新数据
```

全程包裹在 HISTORY.START_RECORD / END_RECORD 中。

### 4.2 复制粘贴 (`copy.ts`)

- **复制范围**：Block、Text、Port（递归深拷贝 `clone(true)`）
- **连线处理**：**不复制连线**，粘贴时不重建连线关系
- Port 复制后会从原父元素脱离

### 4.3 删除 (`deleteItem.ts`)

```
获取选中 → findTopLevelNodes → 清空选中 → 逐个 removeChild + displayObject.remove
```

- Port 删除时：`processPins(port)` 将 pins 回收到 Block 的 `freePins`
- 连线级联：通过 `removeChild` 机制自动处理

### 4.4 加载 Block (`loadBlock.ts`)

三种来源，统一输出 Block 实例：

| 来源 | 函数 | 关键逻辑 |
|------|------|----------|
| CBB 库 | `createCbbBlock` | 调用 API 获取 JSON → 解析 ELK 布局 → 按四边分配 Port |
| 器件库 | `createDeviceBlock` | 遍历 `deviceInfo.portPins` → 有 portLabel 建 Port，无则进 freePins |
| 个人库 | `createPersonalBlock` | 深拷贝 JSON → 为所有 Pin/Port 生成新 ID |

---

## 5. 状态管理架构

**核心设计：编辑器状态主要不在 Pinia 中，而是用单例 + 普通类实例 + EventBus 驱动。**

### 5.1 editorInst 单例（核心状态容器）

```typescript
// views/editor/editor.ts
class SolutionEditor {
  project = new SolutionProject();     // 当前项目（含 curPage）
  editable = false;                     // 是否可编辑
  visual: GVisualSetup;                 // 画布实例
  history?: History;                    // 撤销历史
  state: State = { operate: 'NORMAL' }; // 当前操作状态
  eventHandler: IEventHandler;          // 事件处理器
}
export const editorInst = new SolutionEditor();
```

所有 action 文件通过 `import { editorInst }` 访问项目/画布/状态。

### 5.2 cellStateManager（选中状态）

```typescript
// views/editor/stores/selection.ts
class CellStateManager {
  selectCells = new Map<string, BaseElement>();  // 选中元素集合
  hoverKey/cell: BaseElement | undefined;         // hover 元素
  currentKey/cell: BaseElement | undefined;       // 当前元素
}
export const cellStateManager = new CellStateManager();
```

非 Pinia，非响应式——靠 `visualBus.emit(SELECT_CHANGED)` 通知 UI 更新。

### 5.3 Pinia Store（仅 3 个）

| Store | 文件 | 用途 |
|-------|------|------|
| `usePermissionStore` | `stores/permission.ts` | 权限列表与检查 |
| `usePageCheckStore` | `views/editor/stores/pageCheck.ts` | 页面签入/签出状态 |
| `useShortcutEnable` | `views/editor/stores/shortcutEnable.ts` | 快捷键启用状态 |

### 5.4 状态查找速查

| 要读什么 | 去哪里找 |
|----------|----------|
| 当前项目 | `editorInst.project` |
| 当前页面 | `editorInst.project.curPage` |
| 当前操作模式 | `editorInst.state.operate` |
| 画布实例 | `editorInst.visual` |
| 选中元素 | `cellStateManager.selectCells` |
| hover 元素 | `cellStateManager.hoverCell` |
| 用户信息 | `useStore().user`（来自 `shared/stores`） |
| 页面可编辑性 | `usePageCheckStore().checkPageEditable(pageId)` |
| 权限检查 | `usePermissionStore().hasPermission(key)` |

---

## 6. 编辑器 UI 结构与模块边界

### 6.1 editor/ 子目录

| 目录 | 关键文件 | 职责 |
|------|----------|------|
| `action/` | addLine, copy, deleteItem, blockAction/, tag/ | 编辑操作 |
| `detailPanel/` | blockPanel, wirePanel, portPanel, textPanel, boardPanel | 右侧属性面板 |
| `projectTree/` | projectTree.vue | 左侧项目/页面树 |
| `contextMenu/` | pageContextMenu.vue | 右键菜单 |
| `handler/` | EventHandler.ts | 鼠标/键盘事件处理 |
| `hooks/` | useStyle.ts | 样式相关逻辑 |
| `stores/` | selection.ts, pageCheck.ts, shortcutEnable.ts | 状态管理 |

> 注：没有独立的 canvas、dialog、setting、sider、toolbar 目录。工具栏在 `components/menuToolbar` 中。

### 6.2 组件通信方式总结

| 方式 | 场景 |
|------|------|
| `editorBus` | 跨组件业务操作：切换页面、刷新数据 |
| `visualBus` | 画布事件：选中/hover 变化、历史记录 |
| `editorInst` 单例 | 各 action 文件访问项目/画布/状态 |
| Pinia Store | 权限、页面签入、快捷键 |
| Props/Emit | 父子组件通信（菜单点击、Canvas 初始化等） |

### 6.3 项目模块边界

```
src/
├── modules/
│   ├── hscope/      ← 主模块（首页、3D 渲染器等）
│   ├── solution/    ← 框图编辑器（本 Skill 覆盖范围）
│   └── sketch/      ← 草图模块
├── shared/          ← 公共层（stores/api/components/utils/types）
└── entry/
    └── router/index.ts  ← 路由定义（手动注册，Hash 模式）
```

solution 路由：`/hscope/solution/editor` → `views/editor/index.vue`

solution 从 shared 获取：用户信息（`useStore().user`）、公共 API 封装、公共组件。
solution 从 hscope 获取：MenuToolbar 类型定义、浮动菜单配置。
通知消息使用 `@plmcsdk/common-ui` 的 `Message.success/error/warning`。

---

## 7. 数据模型速查

> 详细类型定义见 `references/types-and-api.md`

### 7.1 元素类层级

```
BaseElement<Props, Style>
├── Graph          （根容器，每个页面一个）
├── Block          （功能模块，含 business.model: General/CBB/Component）
│   └── Port       （接口端口，含 direction: IN/OUT）
├── Wire           （连线，source/target 指向 Port）
├── Text           （文本标注）
└── Board          （面板）
```

### 7.2 业务类

- `SolutionProject` — 项目容器，含 `pages: SolutionPage[]` + `curPage`
- `SolutionPage` — 页面，含 `detail: SolutionPageDetail`（version + graph + tagInfos）
- `SolutionPageDetail.graph` — 即 Graph 元素，整个页面的元素树根节点

### 7.3 Block 业务字段

```typescript
interface BlockBusiness {
  tag: string[];           // 标签
  model: BlockType;        // General | CBB | Component
  category: string;        // 分类
  code: string;            // 编码（CBB 编号等）
  freePins?: Pin[];        // 未分配到 Port 的独立引脚
}
```

---

## 8. API 接口概览

| 模块 | 关键接口 | 说明 |
|------|----------|------|
| Project | `getProject`, `addProject`, `deleteProject` | 项目 CRUD |
| Page | `getPageByProjectId`, `addPage`, `updatePage`, `deletePage` | 页面 CRUD，文件上传用 FormData |
| Block | `getBlockPage`, `saveBlock`, `deleteBlock` | 个人块管理 |
| CBB | `getCbbFile`, `getCbbPage`, `getCbbLand` | CBB 库查询，返回 ICbbJson |
| Port | `getAllPortName`, `getPortDetail` | 端口查询 |
| Task | `getTask`, `getTaskDetail` | 任务流转 |
| Share | `getCollaborators`, `batchUpdate`, `getPermission` | 协作与权限 |
| PageCheck | `getPageCheckList`, `updatePageCheck` | 页面检出/检入 |

---

## 9. 开发协作指南

### 9.1 Claude Code 模式（推荐）

在 Claude Code 环境中，Claude 可以直接读写本地代码仓库：

- **直接读文件**：Claude 根据 Skill 上下文定位相关文件，用 Read/Glob/Grep 工具自行查阅
- **直接改文件**：Claude 生成代码修改并直接写入文件，用户 review 后 commit
- **运行验证**：Claude 可执行 lint/type-check 等命令验证修改

### 9.2 典型开发流程（Claude Code）

```
用户：描述需求 / Bug
    ↓
Claude：基于 Skill 上下文 + Grep/Glob 定位相关文件，阅读代码
    ↓
Claude：给出方案，讨论确认后直接修改文件
    ↓
Claude：运行 type-check / lint 验证
    ↓
用户：review diff → git commit
```

### 9.3 claude.ai Chat 模式（备用）

如果在 claude.ai 网页端讨论，Claude 无法直接访问内网代码仓库，需要用户手动贴代码：

1. Claude 根据 Skill 上下文判断需要看哪个文件，告诉用户文件路径
2. 用户把文件内容复制粘贴到对话中
3. Claude 给出修改方案（含代码片段），用户在本地执行

### 9.4 Skill 维护

当代码结构发生重大变更（新增模块、重构核心机制、API 变动）时，应更新本 Skill。在 Claude Code 中可直接编辑 `.claude/skills/solution-codebase/SKILL.md`。

---

## 参考文件

当需要查看完整类型定义和 API 签名时：
→ 读取 `references/types-and-api.md`
