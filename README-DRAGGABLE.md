# Liquid Glass Decoupled Drag Architecture

## Overview

Starting from version 2.0, Liquid Glass adopts a decoupled architecture that separates core visual effects from drag functionality:

- **`LiquidGlassCore`**: Responsible for liquid glass visual effects and rendering
- **`LiquidGlassDraggable`**: Independent drag utility class that can optionally add drag functionality to any `LiquidGlassCore` instance

## Basic Usage

### 1. Visual Effects Only (Non-draggable)

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

### 2. Adding Drag Functionality

```typescript
import { LiquidGlassCore } from "./src/core";
import { LiquidGlassDraggable } from "./src/draggable";

const liquidGlass = new LiquidGlassCore({
  size: { width: 300, height: 200 },
  position: { x: 100, y: 100 },
});

liquidGlass.init();
liquidGlass.appendTo(document.body);

// Create drag functionality
const draggable = new LiquidGlassDraggable(liquidGlass, {
  constrainToViewport: true,
  onDragStart: (position) => console.log("Drag started:", position),
  onDrag: (position) => console.log("Dragging:", position),
  onDragEnd: (position) => console.log("Drag ended:", position),
});
```

## API Documentation

### LiquidGlassCore

#### Public Methods

- `init()`: Initialize liquid glass effect
- `appendTo(parent: HTMLElement)`: Add element to specified parent container
- `setPosition(position: LiquidGlassPosition)`: Set position
- `getPosition()`: Get current position
- `setSize(size: LiquidGlassSize)`: Set dimensions
- `getSize()`: Get current dimensions
- `getContainer()`: Get DOM container element
- `getBounds()`: Get boundary information
- `constrainPosition(x, y)`: Constrain position within viewport
- `updateConfig(config)`: Update configuration
- `updateEffects(effects)`: Update visual effects
- `destroy()`: Destroy instance

### LiquidGlassDraggable

#### Constructor

```typescript
new LiquidGlassDraggable(target: LiquidGlassCore, config?: DraggableConfig)
```

#### Configuration Options (DraggableConfig)

```typescript
interface DraggableConfig {
  constrainToViewport?: boolean; // Whether to restrict within viewport
  onDragStart?: (position) => void; // Drag start callback
  onDrag?: (position) => void; // Dragging callback
  onDragEnd?: (position) => void; // Drag end callback
}
```

#### Public Methods

- `setConfig(config)`: Update drag configuration
- `isDragginActive()`: Check if currently dragging
- `destroy()`: Destroy drag functionality

## Advanced Usage Examples

### 1. Custom Drag Behavior

```typescript
const draggable = new LiquidGlassDraggable(liquidGlass, {
  constrainToViewport: false,
  onDragStart: (position) => {
    // Change opacity when drag starts
    const container = liquidGlass.getContainer();
    if (container) container.style.opacity = "0.8";
  },
  onDrag: (position) => {
    // Dynamically adjust effects during dragging
    liquidGlass.updateEffects({
      blurAmount: Math.max(0.1, 0.5 - Math.abs(position.x - 200) / 1000),
      saturation: 1.0 + Math.abs(position.y - 300) / 500,
    });
  },
  onDragEnd: (position) => {
    // Restore opacity when drag ends
    const container = liquidGlass.getContainer();
    if (container) container.style.opacity = "1";
  },
});
```

### 2. Programmatic Position Control

```typescript
// Circular path animation
let angle = 0;
const centerX = window.innerWidth / 2;
const centerY = window.innerHeight / 2;
const radius = 100;

const animate = () => {
  angle += 0.02;
  const x = centerX + Math.cos(angle) * radius;
  const y = centerY + Math.sin(angle) * radius;

  liquidGlass.setPosition({ x, y });

  // Dynamically adjust effects based on position
  const normalizedAngle = (angle % (Math.PI * 2)) / (Math.PI * 2);
  liquidGlass.updateEffects({
    chromaticAberration: normalizedAngle * 2,
    cornerRadius: 50 + normalizedAngle * 100,
  });

  requestAnimationFrame(animate);
};

animate();
```

### 3. Multi-instance Cooperation

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
      // When one instance is dragged, others react
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

## Mobile Support

`LiquidGlassDraggable` automatically supports touch events without additional configuration:

- `touchstart` → `mousedown`
- `touchmove` → `mousemove`
- `touchend` → `mouseup`

## Performance Optimization

### Best Practices

1. **Throttle drag events**: For complex calculations during dragging
2. **Use `requestAnimationFrame`**: For smooth animations
3. **Batch updates**: Avoid frequent individual property updates
4. **Cleanup**: Always call `destroy()` when removing instances

### Example: Optimized Multi-instance

```typescript
// Throttle function
function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Optimized drag handling
const throttledDragHandler = throttle((position) => {
  // Batch all effect updates
  const updates = [];

  instances.forEach((other) => {
    if (other.liquidGlass !== currentInstance) {
      const distance = calculateDistance(position, other.position);
      const influence = calculateInfluence(distance);

      updates.push({
        instance: other.liquidGlass,
        effects: {
          displacementScale: 1.0 + influence * 0.5,
          blurAmount: 0.2 + influence * 0.3,
        },
      });
    }
  });

  // Apply all updates in a single frame
  requestAnimationFrame(() => {
    updates.forEach((update) => {
      update.instance.updateEffects(update.effects);
    });
  });
}, 16); // ~60fps
```

## Integration Examples

### React Component

```tsx
import React, { useEffect, useRef } from "react";
import { LiquidGlassCore } from "./src/core";
import { LiquidGlassDraggable } from "./src/draggable";

const LiquidGlassComponent: React.FC<{
  size?: { width: number; height: number };
  position?: { x: number; y: number };
  draggable?: boolean;
}> = ({ size, position, draggable = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const liquidGlassRef = useRef<LiquidGlassCore | null>(null);
  const draggableRef = useRef<LiquidGlassDraggable | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      const liquidGlass = new LiquidGlassCore({
        size: size || { width: 300, height: 200 },
        position: position || { x: 0, y: 0 },
      });

      liquidGlass.init();
      liquidGlass.appendTo(containerRef.current);
      liquidGlassRef.current = liquidGlass;

      if (draggable) {
        const draggableInstance = new LiquidGlassDraggable(liquidGlass, {
          constrainToViewport: true,
        });
        draggableRef.current = draggableInstance;
      }

      return () => {
        draggableRef.current?.destroy();
        liquidGlassRef.current?.destroy();
      };
    }
  }, [size, position, draggable]);

  return <div ref={containerRef} />;
};
```

### Vue Component

```vue
<template>
  <div ref="container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { LiquidGlassCore } from "./src/core";
import { LiquidGlassDraggable } from "./src/draggable";

interface Props {
  size?: { width: number; height: number };
  position?: { x: number; y: number };
  draggable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  draggable: true,
});

const container = ref<HTMLDivElement>();
let liquidGlass: LiquidGlassCore | null = null;
let draggableInstance: LiquidGlassDraggable | null = null;

onMounted(() => {
  if (container.value) {
    liquidGlass = new LiquidGlassCore({
      size: props.size || { width: 300, height: 200 },
      position: props.position || { x: 0, y: 0 },
    });

    liquidGlass.init();
    liquidGlass.appendTo(container.value);

    if (props.draggable) {
      draggableInstance = new LiquidGlassDraggable(liquidGlass, {
        constrainToViewport: true,
      });
    }
  }
});

onUnmounted(() => {
  draggableInstance?.destroy();
  liquidGlass?.destroy();
});
</script>
```

## Troubleshooting

### Common Issues

1. **Performance degradation with multiple instances**

   - Solution: Use throttled event handlers and batch updates

2. **Memory leaks**

   - Solution: Always call `destroy()` methods when removing instances

3. **Touch events not working on mobile**

   - Solution: Ensure `touch-action: none` CSS property is set on draggable elements

4. **Viewport constraint issues**
   - Solution: Check that parent container has proper positioning context

### Debug Mode

Enable debug logging by setting:

```typescript
window.LIQUID_GLASS_DEBUG = true;
```

This will log drag events, position updates, and performance metrics to the console.

## Migration Guide

### From v1.x to v2.x

1. **Separate imports**: Import `LiquidGlassCore` and `LiquidGlassDraggable` separately
2. **Manual drag setup**: Drag functionality is no longer automatic - create `LiquidGlassDraggable` instance manually
3. **Configuration changes**: Some configuration options have moved to the draggable class

#### Before (v1.x)

```typescript
const liquidGlass = new LiquidGlass({
  draggable: true,
  onDragStart: handler,
});
```

#### After (v2.x)

```typescript
const liquidGlass = new LiquidGlassCore();
const draggable = new LiquidGlassDraggable(liquidGlass, {
  onDragStart: handler,
});
```

## License

MIT License
