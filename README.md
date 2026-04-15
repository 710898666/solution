# 跨板连接器 Pin Mapping（静态交互原型）

这是一个前端静态页面原型，用于演示跨板信号线在框图中创建与调整连接器的交互流程。

## 项目目标

- 演示跨板信号线的连接器创建逻辑
- 支持“先选线，再操作”的工程化交互习惯
- 展示 Pin Mapping 的增删、并线、拖拽调序能力

## 当前交互能力

### 场景一：跨板线创建与调整连接器

- 单击选中线段，`Ctrl` 多选
- 右键打开就地菜单
- 基于已选线创建 Connector（支持每对容量与分组方式）
- 创建后可继续右键调整分组（移动到其他 Connector、移出 Connector）

### 场景二：默认 1:1 Mapping

- 每个信号默认占用 1 个 Pin
- 展示基础映射关系

### 场景三：电源并线编辑

- 为同一信号增加/移除并联 Pin
- J1/J2 映射联动更新

### 场景四：拖拽调序

- 拖拽行顺序
- 自动重排 Pin 编号

## 运行方式

这是纯静态页面项目，无需安装依赖。

直接双击打开 [index.html](./index.html) 即可，或使用本地静态服务器启动：

```bash
npx serve . -l 3000 --no-clipboard
```

然后访问 `http://localhost:3000`。

## 目录结构

```text
.
├─ index.html                 # 页面入口
├─ css/
│  └─ style.css               # 样式文件
├─ js/
│  ├─ app.js                  # 应用入口
│  ├─ data.js                 # 场景数据与描述
│  ├─ scene-manager-v2.js     # 场景管理（含场景一右键交互）
│  ├─ table-renderer.js       # Pin Mapping 表格渲染
│  ├─ pin-manager.js          # Pin 增删与重排
│  ├─ drag-sort.js            # 拖拽排序
│  └─ toast.js                # 提示消息
└─ connector-pin-mapping.html # 旧页面/参考文件
```

## 备注

- 当前为交互原型，核心目标是验证流程与体验，不是完整生产版 EDA 工程。
- 后续可继续扩展框选、批量规则校验、连接器规格库等能力。

