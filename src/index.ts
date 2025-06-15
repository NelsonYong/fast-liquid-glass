// 导出核心类和相关接口
export {
  LiquidGlassCore as FastLiquidGlass,
  type LiquidGlassConfig,
  type LiquidGlassPosition,
  type LiquidGlassSize,
  type LiquidGlassStyleConfig,
  type LiquidGlassSVGConfig,
  type LiquidGlassEffectConfig,
  type MouseState
} from './core';

// 导出拖拽工具类
export {
  LiquidGlassDraggable,
  type DraggableConfig
} from './draggable'; 