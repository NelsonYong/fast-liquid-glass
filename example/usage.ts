import { LiquidGlassCore, LiquidGlassConfig } from '../src/core';

// 基本使用示例
function createBasicLiquidGlass() {
  const liquidGlass = new LiquidGlassCore();
  liquidGlass.init();
  liquidGlass.appendTo(document.body);

  return liquidGlass;
}

// 自定义配置示例
function createCustomLiquidGlass() {
  const config: LiquidGlassConfig = {
    size: { width: 400, height: 300 },
    position: { x: 100, y: 100 },
    draggable: true,
    constrainToViewport: true,
    style: {
      borderRadius: '20px',
      zIndex: 8888,
      cursor: 'move',
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(0.5px) brightness(1.3) saturate(1.2)'
    },
    svg: {
      filterUnits: 'userSpaceOnUse',
      colorInterpolationFilters: 'sRGB',
      xChannelSelector: 'R',
      yChannelSelector: 'G'
    },
    // 自定义片段着色器
    fragment: (uv, mouse) => {
      const ix = uv.x - 0.5;
      const iy = uv.y - 0.5;

      // 使用鼠标位置影响变形
      const mouseInfluence = 0.1;
      const distFromMouse = LiquidGlassCore.vectorLength(
        ix - (mouse.x - 0.5),
        iy - (mouse.y - 0.5)
      );

      const distanceToEdge = LiquidGlassCore.roundedRectSDF(ix, iy, 0.35, 0.25, 0.5);
      const displacement = LiquidGlassCore.smoothStep(0.9, 0, distanceToEdge - 0.1);
      const mouseEffect = LiquidGlassCore.smoothStep(0.3, 0, distFromMouse) * mouseInfluence;
      const scaled = LiquidGlassCore.smoothStep(0, 1, displacement + mouseEffect);

      return LiquidGlassCore.texture(ix * scaled + 0.5, iy * scaled + 0.5);
    }
  };

  const liquidGlass = new LiquidGlassCore(config);
  liquidGlass.init();
  liquidGlass.appendTo(document.body);

  return liquidGlass;
}

// 动态更新配置示例
function createDynamicLiquidGlass() {
  const liquidGlass = new LiquidGlassCore({
    size: { width: 200, height: 150 },
    position: { x: 200, y: 200 }
  });

  liquidGlass.init();
  liquidGlass.appendTo(document.body);

  // 5秒后改变位置
  setTimeout(() => {
    liquidGlass.setPosition({ x: 400, y: 300 });
  }, 5000);

  // 10秒后改变大小
  setTimeout(() => {
    liquidGlass.setSize({ width: 350, height: 250 });
  }, 10000);

  // 15秒后更新完整配置
  setTimeout(() => {
    liquidGlass.updateConfig({
      style: {
        borderRadius: '50px',
        zIndex: 9999,
        cursor: 'grab',
        boxShadow: '0 12px 24px rgba(255, 0, 0, 0.2)',
        backdropFilter: 'blur(1px) brightness(2) saturate(0.8)'
      }
    });
  }, 15000);

  return liquidGlass;
}

// 多个实例示例
function createMultipleLiquidGlass() {
  const instances: LiquidGlassCore[] = [];

  for (let i = 0; i < 3; i++) {
    const config: LiquidGlassConfig = {
      size: { width: 150 + i * 50, height: 100 + i * 30 },
      position: { x: 50 + i * 200, y: 50 + i * 100 },
      style: {
        borderRadius: `${20 + i * 10}px`,
        zIndex: 9000 + i,
        cursor: 'grab',
        boxShadow: `0 4px 8px rgba(${i * 80}, ${255 - i * 80}, ${128 + i * 60}, 0.3)`,
        backdropFilter: `blur(${0.2 + i * 0.1}px) brightness(${1.2 + i * 0.2}) saturate(${1 + i * 0.3})`
      }
    };

    const liquidGlass = new LiquidGlassCore(config);
    liquidGlass.init();
    liquidGlass.appendTo(document.body);
    instances.push(liquidGlass);
  }

  return instances;
}

// 导出使用函数
export {
  createBasicLiquidGlass,
  createCustomLiquidGlass,
  createDynamicLiquidGlass,
  createMultipleLiquidGlass
};

// 浏览器环境下的自动初始化示例
if (typeof window !== 'undefined') {
  // 等待 DOM 加载完成
  document.addEventListener('DOMContentLoaded', () => {
    console.log('LiquidGlass Core ready!');

    // 可以在这里创建默认实例
    // createBasicLiquidGlass();
  });
} 