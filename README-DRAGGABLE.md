# Liquid Glass 分离式拖拽架构

## 概述

从版本 2.0 开始，Liquid Glass 采用了分离式架构，将核心视觉效果和拖拽功能分离：

- **`LiquidGlassCore`**: 负责液体玻璃的视觉效果和渲染
- **`LiquidGlassDraggable`**: 独立的拖拽工具类，可选择性地为任何 `LiquidGlassCore` 实例添加拖拽功能

## 基本使用

### 1. 仅视觉效果（不可拖拽）

```typescript
import { LiquidGlassCore } from "./src/core";

const liquidGlass = new LiquidGlassCore({
  size: { width: 300, height: 200 },
  position: { x: 100, y: 100 },
  effects: {
    displacementScale: 1.0,
    blurAmount: 0.25,
    saturation: 1.1,
    chromaticAberration: 0.0,
    elasticity: 1.0,
    cornerRadius: 150,
  },
});

liquidGlass.init();
liquidGlass.appendTo(document.body);
```

### 2. 添加拖拽功能

```typescript
import { LiquidGlassCore } from "./src/core";
import { LiquidGlassDraggable } from "./src/draggable";

const liquidGlass = new LiquidGlassCore({
  size: { width: 300, height: 200 },
  position: { x: 100, y: 100 },
});

liquidGlass.init();
liquidGlass.appendTo(document.body);

// 创建拖拽功能
const draggable = new LiquidGlassDraggable(liquidGlass, {
  constrainToViewport: true,
  onDragStart: (position) => console.log("拖拽开始:", position),
  onDrag: (position) => console.log("拖拽中:", position),
  onDragEnd: (position) => console.log("拖拽结束:", position),
});
```

## API 文档

### LiquidGlassCore

#### 公共方法

- `init()`: 初始化液体玻璃效果
- `appendTo(parent: HTMLElement)`: 将元素添加到指定父容器
- `setPosition(position: LiquidGlassPosition)`: 设置位置
- `getPosition()`: 获取当前位置
- `setSize(size: LiquidGlassSize)`: 设置尺寸
- `getSize()`: 获取当前尺寸
- `getContainer()`: 获取 DOM 容器元素
- `getBounds()`: 获取边界信息
- `constrainPosition(x, y)`: 约束位置到视口内
- `updateConfig(config)`: 更新配置
- `updateEffects(effects)`: 更新视觉效果
- `destroy()`: 销毁实例

### LiquidGlassDraggable

#### 构造函数

```typescript
new LiquidGlassDraggable(target: LiquidGlassCore, config?: DraggableConfig)
```

#### 配置选项 (DraggableConfig)

```typescript
interface DraggableConfig {
  constrainToViewport?: boolean; // 是否限制在视口内
  onDragStart?: (position) => void; // 拖拽开始回调
  onDrag?: (position) => void; // 拖拽中回调
  onDragEnd?: (position) => void; // 拖拽结束回调
}
```

#### 公共方法

- `setConfig(config)`: 更新拖拽配置
- `isDragginActive()`: 检查是否正在拖拽
- `destroy()`: 销毁拖拽功能

## 高级用法示例

### 1. 自定义拖拽行为

```typescript
const draggable = new LiquidGlassDraggable(liquidGlass, {
  constrainToViewport: false,
  onDragStart: (position) => {
    // 拖拽开始时改变透明度
    const container = liquidGlass.getContainer();
    if (container) container.style.opacity = "0.8";
  },
  onDrag: (position) => {
    // 拖拽过程中动态调整效果
    liquidGlass.updateEffects({
      blurAmount: Math.max(0.1, 0.5 - Math.abs(position.x - 200) / 1000),
      saturation: 1.0 + Math.abs(position.y - 300) / 500,
    });
  },
  onDragEnd: (position) => {
    // 拖拽结束时恢复透明度
    const container = liquidGlass.getContainer();
    if (container) container.style.opacity = "1";
  },
});
```

### 2. 程序化位置控制

```typescript
// 圆形路径动画
let angle = 0;
const centerX = window.innerWidth / 2;
const centerY = window.innerHeight / 2;
const radius = 100;

const animate = () => {
  angle += 0.02;
  const x = centerX + Math.cos(angle) * radius;
  const y = centerY + Math.sin(angle) * radius;

  liquidGlass.setPosition({ x, y });

  // 根据位置动态调整效果
  const normalizedAngle = (angle % (Math.PI * 2)) / (Math.PI * 2);
  liquidGlass.updateEffects({
    chromaticAberration: normalizedAngle * 2,
    cornerRadius: 50 + normalizedAngle * 100,
  });

  requestAnimationFrame(animate);
};

animate();
```

### 3. 多实例协同

```typescript
const instances = [];

for (let i = 0; i < 3; i++) {
  const liquidGlass = new LiquidGlassCore({
    size: { width: 150 + i * 20, height: 100 + i * 15 },
    position: { x: 100 + i * 200, y: 100 + i * 50 },
  });

  liquidGlass.init();
  liquidGlass.appendTo(document.body);

  const draggable = new LiquidGlassDraggable(liquidGlass, {
    onDrag: (position) => {
      // 当一个实例被拖拽时，其他实例产生反应
      instances.forEach((other) => {
        if (other.liquidGlass !== liquidGlass) {
          const otherPos = other.liquidGlass.getPosition();
          const distance = Math.sqrt(
            Math.pow(position.x - otherPos.x, 2) +
              Math.pow(position.y - otherPos.y, 2)
          );

          const influence = Math.max(0, 1 - distance / 300);
          other.liquidGlass.updateEffects({
            displacementScale: 1.0 + influence * 0.5,
            blurAmount: 0.2 + influence * 0.3,
          });
        }
      });
    },
  });

  instances.push({ liquidGlass, draggable });
}
```

## 移动端支持

`LiquidGlassDraggable` 自动支持触摸事件，无需额外配置：

- `touchstart` → `mousedown`
- `touchmove` → `mousemove`
- `touchend` → `mouseup`

## 性能优化建议

1. **按需创建拖拽功能**: 只为需要拖拽的实例创建 `LiquidGlassDraggable`
2. **及时销毁**: 不再需要时调用 `destroy()` 方法
3. **限制回调频率**: 在 `onDrag` 回调中避免高频操作
4. **使用约束**: 启用 `constrainToViewport` 可以避免不必要的位置计算

## 迁移指南

从旧版本迁移到分离式架构：

### 旧版本

```typescript
const liquidGlass = new LiquidGlass({
  draggable: true,
  // ... other config
});
```

### 新版本

```typescript
const liquidGlass = new LiquidGlassCore({
  // ... config (移除 draggable 属性)
});

// 如果需要拖拽功能
const draggable = new LiquidGlassDraggable(liquidGlass);
```

## 优势

1. **更小的包体积**: 不需要拖拽功能时可以避免引入拖拽代码
2. **更好的灵活性**: 可以自定义拖拽行为，或使用其他拖拽库
3. **更清晰的职责分离**: 视觉效果和交互逻辑完全分离
4. **更好的可测试性**: 可以独立测试视觉效果和拖拽功能
