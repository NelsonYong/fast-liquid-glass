# Liquid Glass Core

一个高度可配置的液体玻璃效果 TypeScript 库，支持自定义样式、SVG 滤镜配置和交互行为。

## 特性

- 🎨 **高度可配置**: 支持样式、位置、大小、SVG 滤镜等各种配置
- 🖱️ **交互支持**: 可拖拽、鼠标响应的液体玻璃效果
- 📱 **响应式**: 自动适应视口约束
- 🔧 **TypeScript**: 完整的类型支持
- 🎯 **多实例**: 支持创建多个独立的液体玻璃实例
- 🔄 **动态更新**: 运行时动态更新配置

## 安装

```bash
npm install liquid-glass-core
```

## 基本使用

```typescript
import { LiquidGlassCore } from "liquid-glass-core";

// 创建基础液体玻璃效果
const liquidGlass = new LiquidGlassCore();
liquidGlass.init();
liquidGlass.appendTo(document.body);
```

## 配置接口

### LiquidGlassConfig

```typescript
interface LiquidGlassConfig {
  size?: LiquidGlassSize; // 大小配置
  position?: LiquidGlassPosition; // 位置配置
  offset?: number; // 视口边界偏移
  canvasDPI?: number; // Canvas DPI 设置
  draggable?: boolean; // 是否可拖拽
  constrainToViewport?: boolean; // 是否约束在视口内
  style?: LiquidGlassStyleConfig; // 样式配置
  svg?: LiquidGlassSVGConfig; // SVG 滤镜配置
  fragment?: FragmentShader; // 自定义片段着色器
}
```

### 样式配置 (LiquidGlassStyleConfig)

```typescript
interface LiquidGlassStyleConfig {
  borderRadius: string; // 边框圆角
  boxShadow: string; // 盒子阴影
  backdropFilter: string; // 背景滤镜
  cursor: string; // 鼠标指针样式
  zIndex: number; // 层级
}
```

### SVG 滤镜配置 (LiquidGlassSVGConfig)

```typescript
interface LiquidGlassSVGConfig {
  filterUnits: string; // 滤镜单位
  colorInterpolationFilters: string; // 颜色插值
  xChannelSelector: string; // X 通道选择器
  yChannelSelector: string; // Y 通道选择器
}
```

## 高级用法

### 自定义配置

```typescript
import { LiquidGlassCore, LiquidGlassConfig } from "liquid-glass-core";

const config: LiquidGlassConfig = {
  size: { width: 400, height: 300 },
  position: { x: 100, y: 100 },
  draggable: true,
  constrainToViewport: true,
  style: {
    borderRadius: "20px",
    zIndex: 8888,
    cursor: "move",
    boxShadow: "0 8px 16px rgba(0, 0, 0, 0.3)",
    backdropFilter: "blur(0.5px) brightness(1.3) saturate(1.2)",
  },
  svg: {
    filterUnits: "userSpaceOnUse",
    colorInterpolationFilters: "sRGB",
    xChannelSelector: "R",
    yChannelSelector: "G",
  },
};

const liquidGlass = new LiquidGlassCore(config);
liquidGlass.init();
liquidGlass.appendTo(document.body);
```

### 自定义片段着色器

```typescript
const config: LiquidGlassConfig = {
  fragment: (uv, mouse) => {
    const ix = uv.x - 0.5;
    const iy = uv.y - 0.5;

    // 使用鼠标位置影响变形
    const mouseInfluence = 0.1;
    const distFromMouse = LiquidGlassCore.vectorLength(
      ix - (mouse.x - 0.5),
      iy - (mouse.y - 0.5)
    );

    const distanceToEdge = LiquidGlassCore.roundedRectSDF(
      ix,
      iy,
      0.35,
      0.25,
      0.5
    );
    const displacement = LiquidGlassCore.smoothStep(
      0.9,
      0,
      distanceToEdge - 0.1
    );
    const mouseEffect =
      LiquidGlassCore.smoothStep(0.3, 0, distFromMouse) * mouseInfluence;
    const scaled = LiquidGlassCore.smoothStep(0, 1, displacement + mouseEffect);

    return LiquidGlassCore.texture(ix * scaled + 0.5, iy * scaled + 0.5);
  },
};
```

### 动态更新

```typescript
const liquidGlass = new LiquidGlassCore();
liquidGlass.init();
liquidGlass.appendTo(document.body);

// 更新位置
liquidGlass.setPosition({ x: 400, y: 300 });

// 更新大小
liquidGlass.setSize({ width: 350, height: 250 });

// 更新完整配置
liquidGlass.updateConfig({
  style: {
    borderRadius: "50px",
    zIndex: 9999,
    cursor: "grab",
    boxShadow: "0 12px 24px rgba(255, 0, 0, 0.2)",
    backdropFilter: "blur(1px) brightness(2) saturate(0.8)",
  },
});
```

## API 参考

### 类方法

#### 构造函数

```typescript
constructor(userConfig?: LiquidGlassConfig)
```

#### 初始化和控制

```typescript
init(): void                                    // 初始化组件
appendTo(parent: HTMLElement): void             // 添加到父元素
destroy(): void                                 // 销毁组件
```

#### 动态更新

```typescript
setPosition(position: LiquidGlassPosition): void  // 设置位置
setSize(size: LiquidGlassSize): void             // 设置大小
updateConfig(newConfig: Partial<LiquidGlassConfig>): void // 更新配置
```

### 静态工具函数

```typescript
LiquidGlassCore.smoothStep(a: number, b: number, t: number): number
LiquidGlassCore.vectorLength(x: number, y: number): number
LiquidGlassCore.roundedRectSDF(x: number, y: number, width: number, height: number, radius: number): number
LiquidGlassCore.texture(x: number, y: number): TextureResult
```

## 默认配置

```typescript
const DEFAULT_CONFIG = {
  size: { width: 300, height: 200 },
  position: { x: 0, y: 0 },
  offset: 10,
  canvasDPI: 1,
  draggable: true,
  constrainToViewport: true,
  style: {
    borderRadius: "150px",
    boxShadow: `
      0 4px 8px rgba(0, 0, 0, 0.25),
      0 -10px 25px inset rgba(0, 0, 0, 0.15),
      0 -1px 4px 1px inset rgba(255, 255, 255, 0.74)
    `,
    backdropFilter: "blur(0.25px) brightness(1.5) saturate(1.1)",
    cursor: "grab",
    zIndex: 9999,
  },
  svg: {
    filterUnits: "userSpaceOnUse",
    colorInterpolationFilters: "sRGB",
    xChannelSelector: "R",
    yChannelSelector: "G",
  },
};
```

## 浏览器兼容性

- Chrome 51+
- Firefox 53+
- Safari 9.1+
- Edge 79+

需要支持以下特性：

- CSS `backdrop-filter`
- SVG filters
- Canvas 2D API
- ES6 Proxy

## 许可证

MIT License
