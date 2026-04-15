# Solution 模块 — 类型定义与 API 签名参考

> 本文件为 SKILL.md 的补充参考，按需加载。包含完整的 TypeScript 类型定义和 API 函数签名。

---

## 目录

1. [元素类型体系](#1-元素类型体系)
2. [业务类型](#2-业务类型)
3. [API 类型与签名](#3-api-类型与签名)
4. [组件 Props](#4-组件-props)
5. [Store 定义](#5-store-定义)
6. [工具函数](#6-工具函数)
7. [常量](#7-常量)

---

## 1. 元素类型体系

### BaseElement

```typescript
interface BasePartial {
  id?: number;
  name?: string;
  style?: Partial<BaseStyle>;
}

interface BaseStyle {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

abstract class BaseElement<Props extends BasePartial, Style extends BaseStyle> {
  type = 'base';
  id: number;
  parentId: number;
  name = '';
  style: Style;
  parent: BaseElement | undefined;
  children: BaseElement[] = [];
  displayObject: G.DisplayObject;
  anchors: { direction: PortDirection; constraint: [number, number] }[] = [];

  abstract update(newValue: Props): void;
  abstract clone(recursive: boolean): this;
  toJSON(): object;
  add(child: BaseElement): void;
  remove(): void;
  removeChild(child: BaseElement): void;
  findById(id: number): BaseElement | undefined;
}
```

### Block

```typescript
enum BlockType {
  GENERAL = 'General',
  CBB = 'CBB',
  COMPONENT = 'Component',
}

interface BlockPartial extends BasePartial {
  abstracts?: string;
  remarks?: string;
  style?: Partial<BlockStyle>;
  business?: Partial<BlockBusiness>;
  userDefine?: [string, string][];
}

interface BlockStyle extends BaseStyle {
  rotate: number;
  fill: number;
  stroke: number;
}

interface BlockBusiness {
  tag: string[];
  model: BlockType;
  category: string;
  code: string;
  freePins?: Pin[];
}

interface Pin {
  id: number;
  name: string;
  parentId: number;
}

class Block extends BaseElement<BlockPartial, BlockStyle> {
  type = 'block';
  abstracts: string;
  remarks: string;
  business: BlockBusiness;
  userDefine: [string, string][] = [];
}
```

### Port

```typescript
interface PortPartial extends BasePartial {
  style?: Partial<PortStyle>;
  business?: Partial<PortBusiness>;
}

interface PortStyle extends BaseStyle {}

interface PortBusiness {
  direction: PortDirection;
}

class Port extends BaseElement<PortPartial, PortStyle> {
  type = 'port';
}
```

### Wire

```typescript
interface WirePartial extends BasePartial {
  style?: Partial<WireStyle>;
  business?: Partial<WireBusiness>;
}

interface WireStyle extends BaseStyle {
  controlPoints: Point[];
}

interface WireBusiness {
  source: Terminal;
  sourcePortDir: PortDirection;
  target: Terminal;
  targetPortDir: PortDirection;
}

class Wire extends BaseElement<WirePartial, WireStyle> {
  type = 'wire';
}
```

### Graph（根容器）

```typescript
class Graph extends BaseElement<GraphPartial, GraphStyle> {
  type = 'graph';
}
```

---

## 2. 业务类型

### SolutionProject

```typescript
class SolutionProject {
  projectId: number;
  projectName: string;
  description: string;
  createDate?: string;
  createdBy?: string;
  lastUpdateDate?: string;
  lastUpdatedBy?: string;
  tableVer: number;
  pages: SolutionPage[] = [];
  child: SolutionPage[] = [];
  curPage: SolutionPage | undefined;

  setFrom(data: ISolutionProjetct): void;
  findPageById(pageId: number | string): SolutionPage | undefined;
  findElementById(fullId: string): BaseElement | undefined;
}
```

### SolutionPage

```typescript
class SolutionPage {
  id: number | string;
  cacheId: number | string;
  parentId?: number | string;
  child: SolutionPage[] = [];
  projectId: number;
  pageName: string;
  createDate: string;
  createdBy: string;
  lastUpdateDate: string;
  lastUpdatedBy: string;
  tableVer: number;
  created = false;
  modified = false;
  deleted = false;
  detail: SolutionPageDetail;

  setFrom(data: ISolutionPage): void;
  findById(id?: number | string): BaseElement | undefined;
}

class SolutionPageDetail {
  version: number;
  dateTime: string;
  graph: Graph;
  tagInfos: TagInfo[] = [];

  toJSON(): object;
}
```

---

## 3. API 类型与签名

### Project API

```typescript
// api/project.ts
getProject(showParticipate?: boolean): HscopeResponse<ISolutionProjetct[]>
getProjectById(id: number): HscopeResponse<ISolutionProjetct>
addProject({ projectName: string }): HscopeResponse<ISolutionProjetct>
updateProject(data: ISolutionProjetct): HscopeResponse<ISolutionProjetct>
deleteProject(id: number): HscopeResponse<ISolutionProjetct>

// api/types/project.ts
interface ISolutionProjetct {
  projectId: number;
  projectName: string;
  description: string;
  createDate?: string;
  createdBy?: string;
  lastUpdateDate?: string;
  lastUpdatedBy?: string;
  tableVer: number;
}

interface ISolutionPage {
  id: number;
  parentId: number;
  projectId: number;
  pageName: string;
  createDate: string;
  createdBy: string;
  lastUpdateDate: string;
  lastUpdatedBy: string;
  tableVer: number;
  child?: ISolutionPage[];
}
```

### Page API

```typescript
// api/page.ts
getPageByProjectId(projectId: number): HscopeResponse<ISolutionPage[]>
addPage(data: FormData): HscopeResponse<ISolutionPage>
updatePage(data: FormData): HscopeResponse<ISolutionPage>
deletePage(id: number): HscopeResponse<ISolutionPage>
downloadFile(id: number): HscopeResponse<ISolutionPage>
```

### Block API

```typescript
// api/block.ts
getBlockPage(params: ISearchBlockParam): HscopeResponse<PageInfo<IPersonalBlock>>
saveBlock(data: FormData): HscopeResponse<IPersonalBlock>
deleteBlock(id: number): HscopeResponse<IPersonalBlock>
downloadBlockFile(id: number): HscopeResponse<null> | { PropertyKey: any }

// api/types/block.ts
interface IPersonalBlock {
  id: number;
  name: string;
  code: string;
  description: string;
  projectId: number;
  createDate: Date;
  createdBy: string;
  lastUpdateDate: Date;
  lastUpdatedBy: string;
}

interface ISearchBlockParam {
  pageNum: number;
  pageSize: number;
  name?: string;
  code?: string;
  searchKey?: number;
  searchValue?: string;
  sortKey?: number;
  sortOrder?: string;
  createDate?: Date;
  projectId: number;
}
```

### CBB API

```typescript
// api/cbb.ts
getCbbFile(cbbNumber: string): ICbbJson | HscopeResponse
getCbbLand(): HscopeResponse<ICbbResponsibility[]>
getCbbPage(params: ISearchCbbParam): HscopeResponse<CbbPageType>

// api/types/cbb.ts
interface ICbbInfo {
  id: string;
  cbbId: string;
  cbbNumber: string;
  cbbName: string;
  cbbVersion: string;
  responsibilityId: string;
  responsibilityPath: string;
  summary: string;
  ownerShip: string;
  lifeCycleState: string;
  epdSymbol: string;
  partNumber: string;
  cbbUrl: string;
  createTime: string;
  lastUpdateTime: string;
  hasBlock: boolean;
}

interface ICbbResponsibility {
  id: string;
  oid: string;
  parentOid: string;
  name: string;
  nameEn: string;
  childLands?: ICbbResponsibility[];
}

interface ISearchCbbParam {
  cbbNumber?: string;
  cbbName?: string;
  cbbFolderID?: string;
  orderByFiled?: string;
  orderBy?: 'DESC' | 'ASC';
  pageSize: number;
  pageNumber: number;
}

interface ICbbJson {
  edges: [];
  children: CbbBlock[];
  id: string;
  layoutOptions?: { algorithm?: string };
}
```

### Task API

```typescript
// api/task.ts
getTask(): HscopeResponse<ISolutionTask[]>
getTaskDetail(id: number): HscopeResponse<ISolutionTask>
downloadFile(id: number): HscopeResponse

// api/types/task.ts
interface ISolutionTask {
  id: number;
  taskName: string;
  createDate: string;
  createdBy: string;
  lastUpdateDate: string;
  lastUpdatedBy: string;
  schemaProjectId: number;
  schemaBoardId: number;
  taskId: string;
  taskProgress: string;
  taskCode: string;
  taskStatus: string;
  taskMsg: string;
  tableVer: number;
}
```

### Share API

```typescript
// api/share.ts
getCollaborators({ projectId: number }): HscopeResponse<ISolutionCollaborator[]>
batchUpdate(data: ICollaboratorUpdateCommand): HscopeResponse<ISolutionCollaborator[]>
getPermission({ projectId: number }): HscopeResponse<{ string: boolean }>

// api/types/share.ts
interface ISolutionCollaborator {
  projectCollaboratorId: number;
  projectId: number;
  collaborator: string;
  permissionRole: string;
  personRole: string;
  isHscopeCreated: string;
  tableVer: number;
}

interface ICollaboratorUpdateCommand {
  projectId: number;
  addList: ICollaboratorAdd[];
  deleteList: number[];
}

enum SolutionPermissionKey {
  EDIT_PROJECT_INFO = 'editProjectInfo',
  DELETE_PROJECT = 'deleteProject',
  VIEW_INFO = 'viewInfo',
  EDIT_INFO = 'editInfo',
}
```

### PageCheck API

```typescript
// api/pageCheck.ts
getPageCheckList(projectId: number): HscopeResponse<IPageCheck[]>
updatePageCheck(list: IPageCheck[], projectId: number): HscopeResponse<IPageCheck[]>

// api/types/pageCheck.ts
enum PageCheckStatus {
  NOT_CHECKED = 0,
  CHECKED_OUT = 1,
  CHECKED_IN = 2,
}

interface IPageCheck {
  id: number;
  projectId: number;
  pageId: number;
  pageVer: number;
  pageStatus: PageCheckStatus;
  checkOutUser: string;
  checkInUser: string;
  hasCollaborator: boolean;
  tableVer: number;
}
```

### Device 类型

```typescript
// api/types/device.ts
interface IDspDevice {
  id: number;
  isPartsTemp: boolean;
  partno: string;
  eccn: string;
  description: string;
  categoryName: string;
  coopPrefRank: string;
  supplyGrade: string;
  adaptProduct: string;
  americanCheck: string;
  pdmState: string;
  pkgType: string;
  componentHighMax: string;
  symbol?: string;
  nominalValue: string;
  remark: string;
}

enum AmericanCheck {
  NONE_A = '0',
  PART_A = '1',
  ALL_A = '2',
}
```

---

## 4. 组件 Props

### FlexForm

```typescript
interface FlexFormProps {
  col: number;                // 列数
  headerHeight?: number;      // 表头高度，默认 28
  header: string[];           // 表头数组
  width: number[];            // 宽度数组
}
// Events: update:width
```

### SplitLayout

```typescript
interface ISplitLayoutProps {
  mode: 'horizontal' | 'vertical';
  modelValue: number[];       // 面板比例
  minWidth: number[];         // 最小宽度
  collapse: boolean[];        // 折叠状态
  collapseTo: ('prev' | 'next')[];
}
// Events: update:modelValue, update:collapse
```

---

## 5. Store 定义

### Permission Store

```typescript
// stores/permission.ts
interface PermissionState {
  permissions: Record<SolutionPermissionKey, boolean>;
  permissionTip: string;
  initialized: boolean;
}

// Actions
fetchPermissions(projectId?: number): Promise<void>
setPermissionTip(tip: string): void
hasPermission(permissionKey?: string): boolean
clearPermissions(): void
```

---

## 6. 工具函数

### 几何计算 (gScope/utils/geometric)

| 函数 | 签名 | 说明 |
|------|------|------|
| `simpfiyLine` | `(points: Point[]) → Point[]` | 简化线条控制点 |
| `findClosestSegment` | `(line: Point[], point: Point) → SegmentResult` | 查找最近线段 |
| `findClosestRectEdge` | `(point: Point, rects: Rectangle[]) → HitResult \| null` | 查找最近矩形边 |
| `roundTo` | `(num: number, base?: number) → number` | 按基数四舍五入 |

### 图算法 (gScope/utils/graph)

| 函数 | 说明 |
|------|------|
| `findTopLevelNodes(nodes: T[])` | 从嵌套元素列表中提取顶层节点（删除操作使用） |
| `findAllUniqueNodes(nodes: T[])` | 去重获取所有唯一节点 |

### 线路路由 (gScope/utils/lineRoute)

| 函数 | 说明 |
|------|------|
| `orth(source, sourceDir, target, targetDir) → Point[]` | 正交折线路由算法 |

### 其他

| 函数 | 文件 | 说明 |
|------|------|------|
| `rgbToHex` | gScope/utils/rgbToHex.ts | RGB 转 Hex |
| `generateId` | gScope/utils/uniqueId.ts | 生成唯一 ID |
| `getmaxZIndex` | gScope/utils/zIndex.ts | 获取当前最大 zIndex |
| `loadPageDetail` | loader/index.ts | 加载页面详情 |
| `useLocalStorageRef<T>(key, default)` | hooks/useLocalStorageRef.ts | localStorage 响应式引用 |

---

## 7. 常量

### meshName (constant/meshName.ts)

画布中 G DisplayObject 的命名常量，用于命中测试和交互判断：

- `EDGE` — 描边
- `LABEL` — 标签
- `MARKER` — 标记
- `CONNECT_MARKER` / `TOP/BOTTOM/LEFT/RIGHT_CONNECT_MARKER` — 四方向连接标记
- `SELECT_MARKER` — 选中标记
- `TOP_LEFT/TOP_RIGHT/BOTTOM_LEFT/BOTTOM_RIGHT_RESIZE_MARKER` — 四角缩放标记
