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
  displacementScale: number;
}

export interface LiquidGlassStyleConfig {
  borderRadius: string;
  cursor: string;
  zIndex: number;
}

export interface LiquidGlassEffectConfig {
  displacementScale: number;      // 位移比例 (0-500)
  blurAmount: number;            // 模糊量 (0.1-10.0)
  coverOpacity: number;          // 覆盖层透明度 (0.0-1.0)
  highlightOpacity: number;      // 高光透明度 (0.0-1.0)
  reflectionOpacity: number;     // 反射层透明度 (0.0-1.0)
  cornerRadius: number;          // 圆角半径 (0-200)
}

export interface LiquidGlassConfig {
  size?: LiquidGlassSize;
  position?: LiquidGlassPosition;
  offset?: number;
  draggable?: boolean;
  constrainToViewport?: boolean;
  style?: LiquidGlassStyleConfig;
  svg?: LiquidGlassSVGConfig;
  effects?: LiquidGlassEffectConfig;
}

export interface MouseState {
  x: number;
  y: number;
}

// Utility functions
function generateId(): string {
  return 'liquid-glass-' + Math.random().toString(36).substr(2, 9);
}

// Default configurations
const DEFAULT_CONFIG: Required<LiquidGlassConfig> = {
  size: { width: 300, height: 200 },
  position: { x: 0, y: 0 },
  offset: 10,
  draggable: true,
  constrainToViewport: true,
  style: {
    borderRadius: '26px',
    cursor: 'grab',
    zIndex: 9999
  },
  svg: {
    filterUnits: 'objectBoundingBox',
    displacementScale: 200
  },
  effects: {
    displacementScale: 200,
    blurAmount: 5.0,
    coverOpacity: 0.12,
    highlightOpacity: 0.5,
    reflectionOpacity: 0.2,
    cornerRadius: 26
  }
};

export class LiquidGlassCore {
  private config: Required<LiquidGlassConfig>;
  private id: string;
  public container: HTMLDivElement | null = null;
  private svg: SVGSVGElement | null = null;
  private outerLayer: HTMLDivElement | null = null;
  private coverLayer: HTMLDivElement | null = null;
  private sharpLayer: HTMLDivElement | null = null;
  private reflectLayer: HTMLDivElement | null = null;
  private contentLayer: HTMLDivElement | null = null;

  private mouse: MouseState = { x: 0, y: 0 };

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
  }

  private createElement(): void {
    this.createSVGFilter();
    this.createContainer();
    this.createLayers();
  }

  private createSVGFilter(): void {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.style.cssText = 'display: none;';

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');

    filter.setAttribute('id', `${this.id}_filter`);
    filter.setAttribute('x', '0%');
    filter.setAttribute('y', '0%');
    filter.setAttribute('width', '100%');
    filter.setAttribute('height', '100%');
    filter.setAttribute('filterUnits', this.config.svg.filterUnits);

    const feDisplacementMap = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap');
    feDisplacementMap.setAttribute('scale', this.config.effects.displacementScale.toString());

    filter.appendChild(feDisplacementMap);
    defs.appendChild(filter);
    this.svg.appendChild(defs);
  }

  private createContainer(): void {
    this.container = document.createElement('div');
    const { size, position, style, effects } = this.config;

    this.container.className = 'liquid-glass-wrapper';
    this.container.style.cssText = `
      position: fixed;
      top: ${position.y}px;
      left: ${position.x}px;
      width: ${size.width}px;
      height: ${size.height}px;
      display: flex;
      overflow: hidden;
      border-radius: ${effects.cornerRadius}px;
      cursor: ${style.cursor};
      z-index: ${style.zIndex};
      pointer-events: auto;
      --border-radius: ${effects.cornerRadius}px;
    `;
  }

  private createLayers(): void {
    if (!this.container) return;

    // Outer layer - backdrop filter with displacement
    this.outerLayer = document.createElement('div');
    this.outerLayer.className = 'liquid-glass-outer';
    this.outerLayer.style.cssText = `
      backdrop-filter: url(#${this.id}_filter);
      position: absolute;
      inset: 0;
      z-index: 0;
      border-radius: var(--border-radius);
      mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect x="0" y="0" width="100%" height="100%" rx="0" ry="0" fill="white"/></svg>'),
        url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect x="5" y="5" width="calc(100% - 10px)" height="calc(100% - 10px)" rx="${Math.max(0, this.config.effects.cornerRadius - 5)}" ry="${Math.max(0, this.config.effects.cornerRadius - 5)}" fill="white"/></svg>');
      mask-composite: exclude;
    `;

    // Cover layer - blur and semi-transparent overlay
    this.coverLayer = document.createElement('div');
    this.coverLayer.className = 'liquid-glass-cover';
    this.coverLayer.style.cssText = `
      backdrop-filter: blur(${this.config.effects.blurAmount}px);
      position: absolute;
      inset: 0;
      z-index: 2;
      border-radius: var(--border-radius);
      background: rgba(0, 0, 0, ${this.config.effects.coverOpacity});
    `;

    // Sharp layer - highlight edges
    this.sharpLayer = document.createElement('div');
    this.sharpLayer.className = 'liquid-glass-sharp';
    this.sharpLayer.style.cssText = `
      position: absolute;
      inset: 0;
      z-index: 3;
      box-shadow: inset 1px 1px 0px 0px rgba(255, 255, 255, ${this.config.effects.highlightOpacity}), 
                  inset -1px -1px 0px 0px rgba(255, 255, 255, ${this.config.effects.highlightOpacity * 1.2});
      border-radius: var(--border-radius);
    `;

    // Reflect layer - inner reflection effect
    this.reflectLayer = document.createElement('div');
    this.reflectLayer.className = 'liquid-glass-reflect';
    this.reflectLayer.style.cssText = `
      position: absolute;
      inset: 1px;
      z-index: 2;
      box-shadow: inset 2px 2px 6px 2px rgba(255, 255, 255, ${this.config.effects.reflectionOpacity}), 
                  inset -2px -2px 4px -1px rgba(255, 255, 255, ${this.config.effects.reflectionOpacity});
      border-radius: var(--border-radius);
    `;

    // Content layer - for user content
    this.contentLayer = document.createElement('div');
    this.contentLayer.className = 'liquid-glass-content';
    this.contentLayer.style.cssText = `
      position: relative;
      z-index: 4;
      display: flex;
      width: 100%;
      height: 100%;
      align-items: center;
      justify-content: center;
    `;

    // Append layers in correct order
    this.container.appendChild(this.outerLayer);
    this.container.appendChild(this.coverLayer);
    this.container.appendChild(this.sharpLayer);
    this.container.appendChild(this.reflectLayer);
    this.container.appendChild(this.contentLayer);
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

    this.container.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.container.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.container) return;

    const rect = this.container.getBoundingClientRect();
    this.mouse.x = (e.clientX - rect.left) / rect.width;
    this.mouse.y = (e.clientY - rect.top) / rect.height;
  }

  private handleMouseLeave(): void {
    this.mouse = { x: 0.5, y: 0.5 };
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

  public getContentLayer(): HTMLDivElement | null {
    return this.contentLayer;
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
  }

  public updateConfig(newConfig: Partial<LiquidGlassConfig>): void {
    const currentParent = this.container?.parentElement;

    this.config = this.mergeConfig(this.config, newConfig);
    this.destroy();
    this.init();

    if (currentParent) {
      this.appendTo(currentParent);
    }
  }

  public updateEffects(effects: Partial<LiquidGlassEffectConfig>): void {
    this.config.effects = { ...this.config.effects, ...effects };

    if (this.container) {
      const currentEffects = this.config.effects;

      // Update container border radius
      this.container.style.borderRadius = `${currentEffects.cornerRadius}px`;
      this.container.style.setProperty('--border-radius', `${currentEffects.cornerRadius}px`);

      // Update cover layer
      if (this.coverLayer) {
        this.coverLayer.style.backdropFilter = `blur(${currentEffects.blurAmount}px)`;
        this.coverLayer.style.background = `rgba(0, 0, 0, ${currentEffects.coverOpacity})`;
      }

      // Update sharp layer
      if (this.sharpLayer) {
        this.sharpLayer.style.boxShadow = `
          inset 1px 1px 0px 0px rgba(255, 255, 255, ${currentEffects.highlightOpacity}), 
          inset -1px -1px 0px 0px rgba(255, 255, 255, ${currentEffects.highlightOpacity * 1.2})
        `;
      }

      // Update reflect layer
      if (this.reflectLayer) {
        this.reflectLayer.style.boxShadow = `
          inset 2px 2px 6px 2px rgba(255, 255, 255, ${currentEffects.reflectionOpacity}), 
          inset -2px -2px 4px -1px rgba(255, 255, 255, ${currentEffects.reflectionOpacity})
        `;
      }

      // Update outer layer mask for new corner radius
      if (this.outerLayer) {
        const innerRadius = Math.max(0, currentEffects.cornerRadius - 5);
        this.outerLayer.style.maskImage = `
          url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect x="0" y="0" width="100%" height="100%" rx="0" ry="0" fill="white"/></svg>'),
          url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect x="5" y="5" width="calc(100% - 10px)" height="calc(100% - 10px)" rx="${innerRadius}" ry="${innerRadius}" fill="white"/></svg>')
        `;
      }
    }

    // Update SVG filter displacement scale
    if (this.svg) {
      const feDisplacementMap = this.svg.querySelector('feDisplacementMap');
      if (feDisplacementMap) {
        feDisplacementMap.setAttribute('scale', this.config.effects.displacementScale.toString());
      }
    }
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

    // Clear layer references
    this.outerLayer = null;
    this.coverLayer = null;
    this.sharpLayer = null;
    this.reflectLayer = null;
    this.contentLayer = null;

    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
  }
}
