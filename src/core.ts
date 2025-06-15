// Configuration interfaces
export interface LiquidGlassPosition {
  x: number;
  y: number;
}

export interface LiquidGlassSize {
  width: number;
  height: number;
}

export interface LiquidGlassSVGConfig {
  filterUnits: string;
  colorInterpolationFilters: string;
  xChannelSelector: string;
  yChannelSelector: string;
}

export interface LiquidGlassStyleConfig {
  borderRadius: string;
  border?: string;
  borderImage?: string;
  boxShadow: string;
  backdropFilter: string;
  cursor: string;
  zIndex: number;
}

export interface LiquidGlassEffectConfig {
  displacementScale: number;      // 位移比例 (0.1-10.0)
  blurAmount: number;            // 模糊量 (0.1-5.0)
  saturation: number;            // 饱和度 (0.1-3.0)
  chromaticAberration: number;   // 色差强度 (0.0-2.0)
  elasticity: number;            // 弹性系数 (0.1-2.0)
  cornerRadius: number;          // 圆角半径 (0-200)
}

export interface LiquidGlassConfig {
  size?: LiquidGlassSize;
  position?: LiquidGlassPosition;
  offset?: number;
  canvasDPI?: number;
  draggable?: boolean;
  constrainToViewport?: boolean;
  style?: LiquidGlassStyleConfig;
  svg?: LiquidGlassSVGConfig;
  effects?: LiquidGlassEffectConfig;
  fragment?: (uv: LiquidGlassPosition, mouse: LiquidGlassPosition) => TextureResult;
}

export interface TextureResult {
  type: string;
  x: number;
  y: number;
}

export interface MouseState {
  x: number;
  y: number;
}

// Utility functions
function smoothStep(a: number, b: number, t: number): number {
  t = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function length(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

function roundedRectSDF(x: number, y: number, width: number, height: number, radius: number): number {
  const qx = Math.abs(x) - width + radius;
  const qy = Math.abs(y) - height + radius;
  return Math.min(Math.max(qx, qy), 0) + length(Math.max(qx, 0), Math.max(qy, 0)) - radius;
}

function texture(x: number, y: number): TextureResult {
  return { type: 't', x, y };
}

function generateId(): string {
  return 'liquid-glass-' + Math.random().toString(36).substr(2, 9);
}

// Default configurations
const DEFAULT_CONFIG: Required<LiquidGlassConfig> = {
  size: { width: 300, height: 200 },
  position: { x: 0, y: 0 },
  offset: 10,
  canvasDPI: 1,
  draggable: true,
  constrainToViewport: true,
  style: {
    borderRadius: '150px',
    // 玻璃边框效果 - 使用更轻微的阴影模拟玻璃边缘，不影响透明度
    boxShadow: `
      0 0 0 1px rgba(255, 255, 255, 0.2),
      0 0 0 2px rgba(255, 255, 255, 0.1),
      inset 0 1px 1px rgba(255, 255, 255, 0.3),
      inset 0 -1px 1px rgba(0, 0, 0, 0.1),
      0 2px 4px rgba(0, 0, 0, 0.1)
    `,
    backdropFilter: 'blur(0.25px) brightness(1.5) saturate(1.1)',
    cursor: 'grab',
    zIndex: 9999
  },
  svg: {
    filterUnits: 'userSpaceOnUse',
    colorInterpolationFilters: 'sRGB',
    xChannelSelector: 'R',
    yChannelSelector: 'G'
  },
  effects: {
    displacementScale: 1.0,
    blurAmount: 0.25,
    saturation: 1.1,
    chromaticAberration: 0.0,
    elasticity: 1.0,
    cornerRadius: 150
  },
  fragment: (uv: LiquidGlassPosition) => {
    const ix = uv.x - 0.5;
    const iy = uv.y - 0.5;
    const distanceToEdge = roundedRectSDF(ix, iy, 0.3, 0.2, 0.6);
    const displacement = smoothStep(0.8, 0, distanceToEdge - 0.15);
    const scaled = smoothStep(0, 1, displacement);
    return texture(ix * scaled + 0.5, iy * scaled + 0.5);
  }
};

export class LiquidGlassCore {
  private config: Required<LiquidGlassConfig>;
  private id: string;
  private container: HTMLDivElement | null = null;
  private svg: SVGSVGElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private feImage: SVGFEImageElement | null = null;
  private feDisplacementMap: SVGFEDisplacementMapElement | null = null;

  private mouse: MouseState = { x: 0, y: 0 };
  private mouseUsed = false;
  private lastShaderUpdate = 0;
  private shaderUpdateThrottle = 16; // ~60fps
  private pendingShaderUpdate = false;
  private imageData: ImageData | null = null;
  private rawValues: Float32Array | null = null;

  constructor(userConfig: LiquidGlassConfig = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, userConfig);
    this.id = generateId();
  }

  private mergeConfig(defaultConfig: Required<LiquidGlassConfig>, userConfig: LiquidGlassConfig): Required<LiquidGlassConfig> {
    return {
      ...defaultConfig,
      ...userConfig,
      size: { ...defaultConfig.size, ...userConfig.size },
      position: { ...defaultConfig.position, ...userConfig.position },
      style: { ...defaultConfig.style, ...userConfig.style },
      svg: { ...defaultConfig.svg, ...userConfig.svg },
      effects: { ...defaultConfig.effects, ...userConfig.effects }
    };
  }

  public init(): void {
    this.createElement();
    this.setupEventListeners();
    this.updateShader();
  }

  private createElement(): void {
    this.createContainer();
    this.createSVGFilter();
    this.createCanvas();
  }

  private createContainer(): void {
    this.container = document.createElement('div');
    const { size, style, position, effects } = this.config;

    // 根据effects配置生成背景滤镜字符串
    const backdropFilterParts = [
      `url(#${this.id}_filter)`,
      `blur(${effects.blurAmount}px)`,
      `brightness(1.5)`,
      `saturate(${effects.saturation})`
    ];

    // 添加色差效果（通过色相旋转模拟）
    if (effects.chromaticAberration > 0) {
      backdropFilterParts.push(`hue-rotate(${effects.chromaticAberration * 10}deg)`);
    }

    const backdropFilter = backdropFilterParts.join(' ');

    this.container.style.cssText = `
      position: fixed;
      top: ${position.y}px;
      left: ${position.x}px;
      width: ${size.width}px;
      height: ${size.height}px;
      overflow: hidden;
      border-radius: ${effects.cornerRadius}px;
      ${style.border ? `border: ${style.border};` : ''}
      ${style.borderImage ? `border-image: ${style.borderImage};` : ''}
      box-shadow: ${style.boxShadow};
      cursor: ${style.cursor};
      backdrop-filter: ${backdropFilter};
      z-index: ${style.zIndex};
      pointer-events: auto;
      transition: all ${0.3 / effects.elasticity}s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      contain: layout style paint;
      transform: translateZ(0);
    `;

    // 添加液体玻璃标识类
    this.container.classList.add('liquid-glass-container');

    // 添加玻璃边框效果的样式表
    this.injectGlassBorderStyles();
  }

  private createSVGFilter(): void {
    const { size, svg } = this.config;

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    this.svg.setAttribute('width', '0');
    this.svg.setAttribute('height', '0');
    this.svg.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: ${this.config.style.zIndex - 1};
    `;

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');

    filter.setAttribute('id', `${this.id}_filter`);
    filter.setAttribute('filterUnits', svg.filterUnits!);
    filter.setAttribute('colorInterpolationFilters', svg.colorInterpolationFilters!);
    filter.setAttribute('x', '0');
    filter.setAttribute('y', '0');
    filter.setAttribute('width', size.width.toString());
    filter.setAttribute('height', size.height.toString());

    this.feImage = document.createElementNS('http://www.w3.org/2000/svg', 'feImage');
    this.feImage.setAttribute('id', `${this.id}_map`);
    this.feImage.setAttribute('width', size.width.toString());
    this.feImage.setAttribute('height', size.height.toString());

    this.feDisplacementMap = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap');
    this.feDisplacementMap.setAttribute('in', 'SourceGraphic');
    this.feDisplacementMap.setAttribute('in2', `${this.id}_map`);
    this.feDisplacementMap.setAttribute('xChannelSelector', svg.xChannelSelector!);
    this.feDisplacementMap.setAttribute('yChannelSelector', svg.yChannelSelector!);

    filter.appendChild(this.feImage);
    filter.appendChild(this.feDisplacementMap);
    defs.appendChild(filter);
    this.svg.appendChild(defs);
  }

  private createCanvas(): void {
    const { size, canvasDPI } = this.config;

    this.canvas = document.createElement('canvas');
    this.canvas.width = size.width * canvasDPI;
    this.canvas.height = size.height * canvasDPI;
    this.canvas.style.display = 'none';

    this.context = this.canvas.getContext('2d')!;
  }

  private injectGlassBorderStyles(): void {
    // 检查是否已经注入过样式
    if (!document.querySelector('#liquid-glass-border-styles')) {
      const style = document.createElement('style');
      style.id = 'liquid-glass-border-styles';
      style.textContent = `
        .liquid-glass-container {
          position: relative;
        }
        
        .liquid-glass-container::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          border-radius: inherit;
          z-index: -2;
          pointer-events: none;
        }
        
        .liquid-glass-container::after {
          content: '';
          position: absolute;
          top: -1px;
          left: -1px;
          right: -1px;
          bottom: -1px;
          border-radius: inherit;
          z-index: -1;
          pointer-events: none;
        }
      `;
      document.head.appendChild(style);
    }
  }

  public constrainPosition(x: number, y: number): LiquidGlassPosition {
    if (!this.config.constrainToViewport) {
      return { x, y };
    }

    const { size, offset } = this.config;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const minX = offset;
    const maxX = viewportWidth - size.width - offset;
    const minY = offset;
    const maxY = viewportHeight - size.height - offset;

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    };
  }

  private setupEventListeners(): void {
    if (!this.container) return;

    // 设置鼠标移动监听，用于着色器效果（非拖拽）
    this.container.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.container.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
  }
  private handleMouseMove(e: MouseEvent): void {
    if (!this.container) return;

    // 更新鼠标位置，用于着色器效果
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = (e.clientX - rect.left) / rect.width;
    this.mouse.y = (e.clientY - rect.top) / rect.height;

    if (this.mouseUsed) {
      this.updateShader();
    }
  }

  private handleMouseLeave(): void {
    // 重置鼠标位置
    this.mouse = { x: 0.5, y: 0.5 };
    if (this.mouseUsed) {
      this.updateShader();
    }
  }

  private handleResize(): void {
    if (!this.container) return;

    const rect = this.container.getBoundingClientRect();
    const constrained = this.constrainPosition(rect.left, rect.top);

    if (rect.left !== constrained.x || rect.top !== constrained.y) {
      this.container.style.left = constrained.x + 'px';
      this.container.style.top = constrained.y + 'px';
    }
  }

  private updateShader(): void {
    if (!this.context || !this.canvas || !this.feImage || !this.feDisplacementMap) return;

    // 节流控制，避免过于频繁的更新
    const now = performance.now();
    if (now - this.lastShaderUpdate < this.shaderUpdateThrottle) {
      if (!this.pendingShaderUpdate) {
        this.pendingShaderUpdate = true;
        setTimeout(() => {
          this.pendingShaderUpdate = false;
          this.updateShader();
        }, this.shaderUpdateThrottle - (now - this.lastShaderUpdate));
      }
      return;
    }

    this.lastShaderUpdate = now;
    this.performShaderUpdate();
  }

  private forceUpdateShader(): void {
    if (!this.context || !this.canvas || !this.feImage || !this.feDisplacementMap) return;

    // 强制更新，绕过节流机制
    this.lastShaderUpdate = performance.now();
    this.performShaderUpdate();
  }

  private performShaderUpdate(): void {
    if (!this.context || !this.canvas || !this.feImage || !this.feDisplacementMap) return;

    const mouseProxy = new Proxy(this.mouse, {
      get: (target, prop) => {
        this.mouseUsed = true;
        return target[prop as keyof MouseState];
      }
    });

    this.mouseUsed = false;

    const { size, canvasDPI } = this.config;
    const w = size.width * canvasDPI;
    const h = size.height * canvasDPI;

    // 重用 ImageData 对象以减少内存分配
    if (!this.imageData || this.imageData.width !== w || this.imageData.height !== h) {
      this.imageData = new ImageData(w, h);
    }

    const data = this.imageData.data;
    let maxScale = 0;

    // 使用 Float32Array 提高性能
    if (!this.rawValues || this.rawValues.length !== w * h * 2) {
      this.rawValues = new Float32Array(w * h * 2);
    }

    // 第一遍：计算位移值
    let valueIndex = 0;
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % w;
      const y = Math.floor(i / 4 / w);
      const pos = this.config.fragment(
        { x: x / w, y: y / h },
        mouseProxy
      );
      const dx = pos.x * w - x;
      const dy = pos.y * h - y;
      maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy));
      this.rawValues[valueIndex++] = dx;
      this.rawValues[valueIndex++] = dy;
    }

    maxScale *= 0.5;

    // 第二遍：生成像素数据
    valueIndex = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = this.rawValues[valueIndex++] / maxScale + 0.5;
      const g = this.rawValues[valueIndex++] / maxScale + 0.5;
      data[i] = r * 255;
      data[i + 1] = g * 255;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }

    this.context.putImageData(this.imageData, 0, 0);

    // 缓存 canvas 数据URL，避免重复生成
    const dataURL = this.canvas.toDataURL();
    this.feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', dataURL);
    this.feDisplacementMap.setAttribute('scale', (maxScale * this.config.effects.displacementScale / canvasDPI).toString());
  }

  public appendTo(parent: HTMLElement): void {
    if (this.svg && this.container) {
      parent.appendChild(this.svg);
      parent.appendChild(this.container);
    }
  }

  public setPosition(position: LiquidGlassPosition): void {
    this.config.position = position;
    if (this.container) {
      const constrained = this.constrainPosition(position.x, position.y);
      this.container.style.left = constrained.x + 'px';
      this.container.style.top = constrained.y + 'px';
    }
  }

  public getPosition(): LiquidGlassPosition {
    if (this.container) {
      const rect = this.container.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    }
    return this.config.position;
  }

  public getSize(): LiquidGlassSize {
    return this.config.size;
  }

  public getContainer(): HTMLDivElement | null {
    return this.container;
  }

  public getBounds(): { x: number; y: number; width: number; height: number } | null {
    if (this.container) {
      const rect = this.container.getBoundingClientRect();
      return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      };
    }
    return null;
  }

  public setSize(size: LiquidGlassSize): void {
    this.config.size = size;
    if (this.container) {
      this.container.style.width = size.width + 'px';
      this.container.style.height = size.height + 'px';
    }

    // Update SVG filter dimensions
    if (this.svg && this.feImage && this.feDisplacementMap) {
      const filter = this.svg.querySelector(`#${this.id}_filter`);
      if (filter) {
        filter.setAttribute('width', size.width.toString());
        filter.setAttribute('height', size.height.toString());
      }

      this.feImage.setAttribute('width', size.width.toString());
      this.feImage.setAttribute('height', size.height.toString());
    }

    // Recreate canvas with new size
    this.createCanvas();
    this.updateShader();
  }

  public updateConfig(newConfig: Partial<LiquidGlassConfig>): void {
    // Remember the current parent element
    const currentParent = this.container?.parentElement;

    this.config = this.mergeConfig(this.config, newConfig);
    // Reinitialize with new config
    this.destroy();
    this.init();

    // Re-append to the same parent if it existed
    if (currentParent) {
      this.appendTo(currentParent);
    }
  }

  public updateEffects(effects: Partial<LiquidGlassEffectConfig>): void {
    this.config.effects = { ...this.config.effects, ...effects };

    if (this.container) {
      const { effects: currentEffects } = this.config;

      // 更新backdrop-filter
      const backdropFilterParts = [
        `url(#${this.id}_filter)`,
        `blur(${currentEffects.blurAmount}px)`,
        `brightness(1.5)`,
        `saturate(${currentEffects.saturation})`
      ];

      if (currentEffects.chromaticAberration > 0) {
        backdropFilterParts.push(`hue-rotate(${currentEffects.chromaticAberration * 10}deg)`);
      }

      this.container.style.backdropFilter = backdropFilterParts.join(' ');
      this.container.style.borderRadius = `${currentEffects.cornerRadius}px`;
      this.container.style.transition = `all ${0.3 / currentEffects.elasticity}s cubic-bezier(0.175, 0.885, 0.32, 1.275)`;
    }

    // 强制更新着色器，绕过节流机制
    this.forceUpdateShader();
  }

  public destroy(): void {
    if (this.svg) {
      this.svg.remove();
      this.svg = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }

    // Clear performance optimization caches
    this.imageData = null;
    this.rawValues = null;

    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);

    // 清理注入的样式（如果没有其他实例在使用）
    const existingContainers = document.querySelectorAll('.liquid-glass-container');
    if (existingContainers.length === 0) {
      const styleElement = document.querySelector('#liquid-glass-border-styles');
      if (styleElement) {
        styleElement.remove();
      }
    }
  }

  // Static utility functions for external use
  public static smoothStep = smoothStep;
  public static vectorLength = length;
  public static roundedRectSDF = roundedRectSDF;
  public static texture = texture;
}
