# Liquid Glass Core

A highly configurable liquid glass effect TypeScript library that supports custom styles, SVG filter configurations, and interactive behaviors.

## Features

- 🎨 **Highly Configurable**: Supports various configurations for styles, position, size, SVG filters, etc.
- 🖱️ **Interactive Support**: Draggable, mouse-responsive liquid glass effects
- 📱 **Responsive**: Automatically adapts to viewport constraints
- 🔧 **TypeScript**: Full type support
- 🎯 **Multi-instance**: Supports creating multiple independent liquid glass instances
- 🔄 **Dynamic Updates**: Dynamically update configurations at runtime

## Installation

```bash
npm install liquid-glass-core
```

## Basic Usage

```typescript
import { LiquidGlassCore } from "liquid-glass-core";

// Create basic liquid glass effect
const liquidGlass = new LiquidGlassCore();
liquidGlass.init();
liquidGlass.appendTo(document.body);
```

## Configuration Interface

### LiquidGlassConfig

```typescript
interface LiquidGlassConfig {
  size?: LiquidGlassSize; // Size configuration
  position?: LiquidGlassPosition; // Position configuration
  offset?: number; // Viewport boundary offset
  canvasDPI?: number; // Canvas DPI setting
  draggable?: boolean; // Whether draggable
  constrainToViewport?: boolean; // Whether constrained to viewport
  style?: LiquidGlassStyleConfig; // Style configuration
  svg?: LiquidGlassSVGConfig; // SVG filter configuration
  fragment?: FragmentShader; // Custom fragment shader
}
```

### Style Configuration (LiquidGlassStyleConfig)

```typescript
interface LiquidGlassStyleConfig {
  borderRadius: string; // Border radius
  boxShadow: string; // Box shadow
  backdropFilter: string; // Backdrop filter
  cursor: string; // Mouse cursor style
  zIndex: number; // Z-index
}
```

### SVG Filter Configuration (LiquidGlassSVGConfig)

```typescript
interface LiquidGlassSVGConfig {
  filterUnits: string; // Filter units
  colorInterpolationFilters: string; // Color interpolation
  xChannelSelector: string; // X channel selector
  yChannelSelector: string; // Y channel selector
}
```

## Advanced Usage

### Custom Configuration

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

### Custom Fragment Shader

```typescript
const config: LiquidGlassConfig = {
  fragment: (uv, mouse) => {
    const ix = uv.x - 0.5;
    const iy = uv.y - 0.5;

    // Use mouse position to influence deformation
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

### Dynamic Updates

```typescript
const liquidGlass = new LiquidGlassCore();
liquidGlass.init();
liquidGlass.appendTo(document.body);

// Update position
liquidGlass.setPosition({ x: 400, y: 300 });

// Update size
liquidGlass.setSize({ width: 350, height: 250 });

// Update complete configuration
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

## API Reference

### Class Methods

#### Constructor

```typescript
constructor(userConfig?: LiquidGlassConfig)
```

#### Initialization and Control

```typescript
init(): void                                    // Initialize component
appendTo(parent: HTMLElement): void             // Add to parent element
destroy(): void                                 // Destroy component
```

#### Dynamic Updates

```typescript
setPosition(position: LiquidGlassPosition): void  // Set position
setSize(size: LiquidGlassSize): void             // Set size
updateConfig(newConfig: Partial<LiquidGlassConfig>): void // Update configuration
```

### Static Utility Functions

```typescript
LiquidGlassCore.smoothStep(a: number, b: number, t: number): number
LiquidGlassCore.vectorLength(x: number, y: number): number
LiquidGlassCore.roundedRectSDF(x: number, y: number, width: number, height: number, radius: number): number
LiquidGlassCore.texture(x: number, y: number): TextureResult
```

## Default Configuration

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

## Browser Compatibility

- Chrome 51+
- Firefox 53+
- Safari 9.1+
- Edge 79+

Requires support for the following features:

- CSS `backdrop-filter`
- SVG filters
- Canvas 2D API
- ES6 Proxy

## License

MIT License
