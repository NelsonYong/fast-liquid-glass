import { LiquidGlassCore } from '../src/core';
import { LiquidGlassDraggable } from '../src/draggable';

// 基本使用示例 - 带拖拽功能
function createDraggableLiquidGlass() {
  // 创建液体玻璃核心实例
  const liquidGlass = new LiquidGlassCore({
    size: { width: 300, height: 200 },
    position: { x: 100, y: 100 },
    effects: {
      displacementScale: 1.2,
      blurAmount: 0.5,
      saturation: 1.3,
      chromaticAberration: 0.1,
      elasticity: 1.5,
      cornerRadius: 80
    }
  });

  // 初始化液体玻璃
  liquidGlass.init();
  liquidGlass.appendTo(document.body);

  // 创建拖拽功能
  const draggable = new LiquidGlassDraggable(liquidGlass, {
    constrainToViewport: true,
    onDragStart: (position) => {
      console.log('拖拽开始:', position);
    },
    onDrag: (position) => {
      console.log('拖拽中:', position);
    },
    onDragEnd: (position) => {
      console.log('拖拽结束:', position);
    }
  });

  return { liquidGlass, draggable };
}

// 只有视觉效果，不可拖拽
function createStaticLiquidGlass() {
  const liquidGlass = new LiquidGlassCore({
    size: { width: 250, height: 150 },
    position: { x: 400, y: 200 },
    effects: {
      displacementScale: 0.8,
      blurAmount: 0.3,
      saturation: 1.1,
      chromaticAberration: 0.0,
      elasticity: 1.0,
      cornerRadius: 120
    }
  });

  liquidGlass.init();
  liquidGlass.appendTo(document.body);

  return liquidGlass;
}

// 自定义拖拽行为
function createCustomDraggableLiquidGlass() {
  const liquidGlass = new LiquidGlassCore({
    size: { width: 200, height: 120 },
    position: { x: 200, y: 300 }
  });

  liquidGlass.init();
  liquidGlass.appendTo(document.body);

  // 自定义拖拽配置
  const draggable = new LiquidGlassDraggable(liquidGlass, {
    constrainToViewport: false, // 允许拖拽到屏幕外
    onDragStart: (position) => {
      // 拖拽开始时增加透明度
      const container = liquidGlass.getContainer();
      if (container) {
        container.style.opacity = '0.8';
      }
    },
    onDrag: (position) => {
      // 拖拽过程中动态调整效果
      liquidGlass.updateEffects({
        blurAmount: Math.max(0.1, 0.5 - Math.abs(position.x - 200) / 1000),
        saturation: 1.0 + Math.abs(position.y - 300) / 500
      });
    },
    onDragEnd: (position) => {
      // 拖拽结束时恢复透明度
      const container = liquidGlass.getContainer();
      if (container) {
        container.style.opacity = '1';
      }

      // 如果拖拽到屏幕边缘，添加弹性效果
      const bounds = liquidGlass.getBounds();
      if (bounds) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (bounds.x < 0 || bounds.x + bounds.width > viewportWidth ||
          bounds.y < 0 || bounds.y + bounds.height > viewportHeight) {

          // 弹回到视口内
          const constrainedPosition = liquidGlass.constrainPosition(position.x, position.y);

          // 添加弹性动画
          const container = liquidGlass.getContainer();
          if (container) {
            container.style.transition = 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            liquidGlass.setPosition(constrainedPosition);

            setTimeout(() => {
              container.style.transition = '';
            }, 500);
          }
        }
      }
    }
  });

  return { liquidGlass, draggable };
}

// 程序化控制位置
function createProgrammaticLiquidGlass() {
  const liquidGlass = new LiquidGlassCore({
    size: { width: 180, height: 100 },
    position: { x: 50, y: 50 }
  });

  liquidGlass.init();
  liquidGlass.appendTo(document.body);

  // 自动移动动画
  let angle = 0;
  const centerX = window.innerWidth / 2 - 90;
  const centerY = window.innerHeight / 2 - 50;
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
      cornerRadius: 50 + normalizedAngle * 100
    });

    requestAnimationFrame(animate);
  };

  animate();

  return liquidGlass;
}

// 多实例协同
function createMultipleInstances() {
  const instances: Array<{ liquidGlass: LiquidGlassCore; draggable: LiquidGlassDraggable }> = [];

  for (let i = 0; i < 3; i++) {
    const liquidGlass = new LiquidGlassCore({
      size: { width: 150 + i * 20, height: 100 + i * 15 },
      position: { x: 100 + i * 200, y: 100 + i * 50 },
      effects: {
        displacementScale: 1.0 + i * 0.3,
        blurAmount: 0.2 + i * 0.1,
        saturation: 1.0 + i * 0.2,
        chromaticAberration: i * 0.1,
        cornerRadius: 60 + i * 30,
        elasticity: 1.0 + i * 0.5
      }
    });

    liquidGlass.init();
    liquidGlass.appendTo(document.body);

    const draggable = new LiquidGlassDraggable(liquidGlass, {
      constrainToViewport: true,
      onDrag: (position) => {
        // 当一个实例被拖拽时，其他实例会有微妙的反应
        instances.forEach((other) => {
          if (other.liquidGlass !== liquidGlass) {
            const otherPos = other.liquidGlass.getPosition();
            const distance = Math.sqrt(
              Math.pow(position.x - otherPos.x, 2) +
              Math.pow(position.y - otherPos.y, 2)
            );

            // 距离越近，效果越强
            const influence = Math.max(0, 1 - distance / 300);
            other.liquidGlass.updateEffects({
              displacementScale: 1.0 + influence * 0.5,
              blurAmount: 0.2 + influence * 0.3
            });
          }
        });
      }
    });

    instances.push({ liquidGlass, draggable });
  }

  return instances;
}

// 导出使用函数
export {
  createDraggableLiquidGlass,
  createStaticLiquidGlass,
  createCustomDraggableLiquidGlass,
  createProgrammaticLiquidGlass,
  createMultipleInstances
};

// 浏览器环境下的示例初始化
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Liquid Glass with Draggable ready!');

    // 可以在这里创建示例
    // createDraggableLiquidGlass();
  });
} 