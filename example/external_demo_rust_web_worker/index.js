// Liquid Glass Effect - Pure WASM Implementation
// All calculations handled by Rust WASM, JavaScript only for DOM operations

(function () {
  "use strict";

  // Check if liquid glass already exists and destroy it
  if (window.liquidGlass) {
    window.liquidGlass.destroy();
    console.log("Previous liquid glass effect removed.");
  }

  // Generate unique ID for SVG elements
  function generateId() {
    return "liquid-glass-" + Math.random().toString(36).substr(2, 9);
  }

  // Main Liquid Glass class - Pure DOM manipulation
  class LiquidGlass {
    constructor(options = {}) {
      this.width = options.width || 320;
      this.height = options.height || 240;
      this.id = generateId();

      // State
      this.worker = null;
      this.wasmReady = false;
      this.isHovering = false;
      this.isDragging = false;
      this.lastUpdateTime = 0;
      this.lastMouseMoveTime = 0;
      this.animationFrame = null;
      this.dragAnimationFrame = null;

      // Performance settings
      this.normalFPS = 70; // Normal animation FPS
      this.dragFPS = 20; // Reduced FPS during drag
      this.mouseMoveThrottle = 0; // ~60fps for mouse moves

      // DOM elements
      this.container = null;
      this.svg = null;
      this.canvas = null;
      this.context = null;
      this.feImage = null;
      this.feDisplacementMap = null;

      this.init();
    }

    async init() {
      this.createElements();
      await this.initializeWasm();
      this.setupEventListeners();
      this.startAnimation();
    }

    createElements() {
      // Main container
      this.container = document.createElement("div");
      this.container.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                width: ${this.width}px;
                height: ${this.height}px;
                overflow: hidden;
                border-radius: 50px;
                box-shadow:
                    0 25px 50px rgba(0, 0, 0, 0.4),
                    0 15px 35px rgba(0, 0, 0, 0.2),
                    0 5px 15px rgba(0, 0, 0, 0.15),
                    0 -15px 30px inset rgba(0, 0, 0, 0.25),
                    0 -5px 15px 2px inset rgba(255, 255, 255, 0.8),
                    0 -2px 8px 1px inset rgba(255, 255, 255, 0.9),
                    0 2px 4px inset rgba(0, 150, 255, 0.3);
                cursor: grab;
                backdrop-filter: url(#${this.id}_filter) blur(0.5px) brightness(1.3) saturate(1.2) contrast(1.1);
                z-index: 9999;
                pointer-events: auto;
                border: 1px solid rgba(255, 255, 255, 0.3);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                will-change: transform;
            `;

      // SVG filter
      this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this.svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      this.svg.setAttribute("width", "0");
      this.svg.setAttribute("height", "0");
      this.svg.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                pointer-events: none;
                z-index: 9998;
            `;

      const defs = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "defs"
      );
      const filter = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "filter"
      );
      filter.setAttribute("id", `${this.id}_filter`);
      filter.setAttribute("filterUnits", "userSpaceOnUse");
      filter.setAttribute("colorInterpolationFilters", "sRGB");
      filter.setAttribute("x", "0");
      filter.setAttribute("y", "0");
      filter.setAttribute("width", this.width.toString());
      filter.setAttribute("height", this.height.toString());

      // Turbulence
      const feTurbulence = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "feTurbulence"
      );
      feTurbulence.setAttribute("baseFrequency", "0.015 0.02");
      feTurbulence.setAttribute("numOctaves", "2");
      feTurbulence.setAttribute("result", "turbulence");

      // Displacement map
      this.feImage = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "feImage"
      );
      this.feImage.setAttribute("id", `${this.id}_map`);
      this.feImage.setAttribute("width", this.width.toString());
      this.feImage.setAttribute("height", this.height.toString());
      this.feImage.setAttribute("result", "displacementMap");

      // Composite
      const feComposite = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "feComposite"
      );
      feComposite.setAttribute("in", "displacementMap");
      feComposite.setAttribute("in2", "turbulence");
      feComposite.setAttribute("operator", "screen");
      feComposite.setAttribute("result", "combinedDisplacement");

      // Final displacement
      this.feDisplacementMap = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "feDisplacementMap"
      );
      this.feDisplacementMap.setAttribute("in", "SourceGraphic");
      this.feDisplacementMap.setAttribute("in2", "combinedDisplacement");
      this.feDisplacementMap.setAttribute("xChannelSelector", "R");
      this.feDisplacementMap.setAttribute("yChannelSelector", "G");

      filter.appendChild(feTurbulence);
      filter.appendChild(this.feImage);
      filter.appendChild(feComposite);
      filter.appendChild(this.feDisplacementMap);
      defs.appendChild(filter);
      this.svg.appendChild(defs);

      // Hidden canvas for displacement map
      this.canvas = document.createElement("canvas");
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.canvas.style.display = "none";
      this.context = this.canvas.getContext("2d");

      // Add to DOM
      document.body.appendChild(this.svg);
      document.body.appendChild(this.container);
    }

    async initializeWasm() {
      try {
        this.worker = new Worker("shader-worker.js");

        this.worker.onmessage = (e) => {
          const { type, data, error } = e.data;

          switch (type) {
            case "init-complete":
              if (data && data.success) {
                // Create WASM state
                this.worker.postMessage({
                  type: "create-state",
                  data: { width: this.width, height: this.height },
                });
              } else {
                console.error(
                  "WASM initialization failed:",
                  data ? data.error : "Unknown error"
                );
              }
              break;

            case "state-created":
              this.wasmReady = true;
              console.log("🦀 WASM Engine ready!");
              // Update viewport
              this.updateViewport();
              break;

            case "frame-result":
              if (error) {
                console.error("Frame computation error:", error);
                return;
              }
              this.handleFrameResult(data);
              break;

            case "error":
              console.error("Worker error:", error);
              break;
          }
        };

        this.worker.onerror = (error) => {
          console.error("Worker initialization error:", error);
        };

        // Initialize worker
        this.worker.postMessage({ type: "init" });
      } catch (error) {
        console.error("Failed to initialize WASM worker:", error);
      }
    }

    handleFrameResult(data) {
      const { imageData, maxScale, transformMatrix, fps } = data;

      // Update canvas with shader result
      const uint8ClampedArray = new Uint8ClampedArray(imageData);
      const imgData = new ImageData(uint8ClampedArray, this.width, this.height);
      this.context.putImageData(imgData, 0, 0);

      // Update SVG filter
      this.feImage.setAttributeNS(
        "http://www.w3.org/1999/xlink",
        "href",
        this.canvas.toDataURL()
      );
      this.feDisplacementMap.setAttribute("scale", (maxScale * 1.3).toString());

      // Update transform
      this.container.style.transform = transformMatrix;

      // Optional: Display FPS
      if (fps > 0) {
        this.displayFPS(fps);
      }
    }

    displayFPS(fps) {
      if (!this.fpsDisplay) {
        this.fpsDisplay = document.createElement("div");
        this.fpsDisplay.style.cssText = `
                    position: fixed;
                    top: 10px;
                    left: 10px;
                    background: rgba(0, 0, 0, 0.7);
                    color: white;
                    padding: 5px 10px;
                    border-radius: 5px;
                    font-family: monospace;
                    font-size: 12px;
                    z-index: 10000;
                `;
        document.body.appendChild(this.fpsDisplay);
      }
      this.fpsDisplay.textContent = `FPS: ${Math.round(fps)}`;
    }

    setupEventListeners() {
      // Mouse events
      // this.container.addEventListener("mousedown", this.onMouseDown.bind(this));
      // this.container.addEventListener(
      //   "mouseenter",
      //   this.onMouseEnter.bind(this)
      // );
      // this.container.addEventListener(
      //   "mouseleave",
      //   this.onMouseLeave.bind(this)
      // );

      // document.addEventListener("mousemove", this.onMouseMove.bind(this));
      // document.addEventListener("mouseup", this.onMouseUp.bind(this));

      // Window events
      window.addEventListener("resize", this.onResize.bind(this));
      document.addEventListener(
        "visibilitychange",
        this.onVisibilityChange.bind(this)
      );
    }

    onMouseDown(e) {
      if (!this.wasmReady) return;

      this.isDragging = true;
      this.container.style.cursor = "grabbing";

      // Stop normal animation and start drag-optimized animation
      this.stopAnimation();
      this.startDragAnimation();

      this.worker.postMessage({
        type: "start-drag",
        data: { mouseX: e.clientX, mouseY: e.clientY },
      });
      e.preventDefault();
    }

    onMouseMove(e) {
      if (!this.wasmReady) return;

      const currentTime = performance.now();

      // Throttle mouse move events
      if (currentTime - this.lastMouseMoveTime < this.mouseMoveThrottle) {
        return;
      }
      this.lastMouseMoveTime = currentTime;

      // Update drag position if dragging
      if (this.isDragging) {
        this.worker.postMessage({
          type: "update-drag",
          data: { mouseX: e.clientX, mouseY: e.clientY },
        });
      }

      // Update mouse position for shader (always, for hover effects)
      const rect = this.container.getBoundingClientRect();
      const relativeX = (e.clientX - rect.left) / rect.width;
      const relativeY = (e.clientY - rect.top) / rect.height;

      this.worker.postMessage({
        type: "update-mouse",
        data: { x: relativeX, y: relativeY },
      });
    }

    onMouseUp() {
      if (!this.wasmReady) return;

      if (this.isDragging) {
        this.isDragging = false;
        this.container.style.cursor = "grab";

        // Stop drag animation and resume normal animation
        this.stopDragAnimation();
        this.startAnimation();

        this.worker.postMessage({ type: "stop-drag" });
      }
    }

    onMouseEnter() {
      this.isHovering = true;
    }

    onMouseLeave() {
      this.isHovering = false;
    }

    onResize() {
      this.updateViewport();
    }

    onVisibilityChange() {
      // Pause/resume animation based on visibility
      if (document.hidden) {
        this.stopAnimation();
        this.stopDragAnimation();
      } else {
        if (this.isDragging) {
          this.startDragAnimation();
        } else {
          this.startAnimation();
        }
      }
    }

    updateViewport() {
      if (!this.wasmReady) return;

      this.worker.postMessage({
        type: "update-viewport",
        data: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      });
    }

    startAnimation() {
      if (this.animationFrame) return; // Avoid duplicate animations

      const animate = (currentTime) => {
        if (!this.wasmReady || this.isDragging) {
          this.animationFrame = requestAnimationFrame(animate);
          return;
        }

        const deltaTime = currentTime - this.lastUpdateTime;
        const normalFrameTime = 1000 / this.normalFPS; // ~16.67ms for 60fps

        // Limit to normal frame rate
        if (deltaTime >= normalFrameTime) {
          // Request frame computation
          this.worker.postMessage({
            type: "compute-frame",
            data: {
              width: this.width,
              height: this.height,
              deltaTime: deltaTime,
              currentTime: currentTime,
            },
          });

          this.lastUpdateTime = currentTime;
        }

        this.animationFrame = requestAnimationFrame(animate);
      };

      animate(performance.now());
    }

    startDragAnimation() {
      if (this.dragAnimationFrame) return; // Avoid duplicate animations

      const dragAnimate = (currentTime) => {
        if (!this.wasmReady || !this.isDragging) {
          this.dragAnimationFrame = requestAnimationFrame(dragAnimate);
          return;
        }

        const deltaTime = currentTime - this.lastUpdateTime;
        const dragFrameTime = 1000 / this.dragFPS; // ~33.33ms for 30fps

        // Limit to drag frame rate (lower for better mouse responsiveness)
        if (deltaTime >= dragFrameTime) {
          // Request frame computation with drag priority
          this.worker.postMessage({
            type: "compute-frame",
            data: {
              width: this.width,
              height: this.height,
              deltaTime: deltaTime,
              currentTime: currentTime,
              isDragging: true, // Hint to worker for optimization
            },
          });

          this.lastUpdateTime = currentTime;
        }

        this.dragAnimationFrame = requestAnimationFrame(dragAnimate);
      };

      dragAnimate(performance.now());
    }

    stopAnimation() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
    }

    stopDragAnimation() {
      if (this.dragAnimationFrame) {
        cancelAnimationFrame(this.dragAnimationFrame);
        this.dragAnimationFrame = null;
      }
    }

    destroy() {
      // Stop all animations
      this.stopAnimation();
      this.stopDragAnimation();

      if (this.worker) {
        this.worker.terminate();
      }
      if (this.svg) {
        this.svg.remove();
      }
      if (this.container) {
        this.container.remove();
      }
      if (this.canvas) {
        this.canvas.remove();
      }
      if (this.fpsDisplay) {
        this.fpsDisplay.remove();
      }
    }
  }

  // Initialize the liquid glass effect
  function createLiquidGlass() {
    const glass = new LiquidGlass({
      width: 320,
      height: 240,
    });

    console.log("🦀 Pure WASM Liquid Glass Effect initialized!");
    console.log(
      "✨ Features: Full Rust computation, zero JavaScript calculations"
    );
    console.log("⚡ Performance: Maximum speed with minimal overhead");

    // Store reference for cleanup
    window.liquidGlass = glass;

    return glass;
  }

  // Start the effect
  createLiquidGlass();
})();
