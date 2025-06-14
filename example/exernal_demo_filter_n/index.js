// Vanilla JS Liquid Glass Effect - Enhanced 3D Version
// Created by Shu Ding (https://github.com/shuding/liquid-glass) in 2025.
// Enhanced with 3D effects and improved glass texture - Performance Optimized

(function () {
  "use strict";

  // Check if liquid glass already exists and destroy it
  if (window.liquidGlass) {
    window.liquidGlass.destroy();
    console.log("Previous liquid glass effect removed.");
  }

  // Enhanced utility functions
  function smoothStep(a, b, t) {
    t = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function length(x, y) {
    return Math.sqrt(x * x + y * y);
  }

  function length3(x, y, z) {
    return Math.sqrt(x * x + y * y + z * z);
  }

  function roundedRectSDF(x, y, width, height, radius) {
    const qx = Math.abs(x) - width + radius;
    const qy = Math.abs(y) - height + radius;
    return (
      Math.min(Math.max(qx, qy), 0) +
      length(Math.max(qx, 0), Math.max(qy, 0)) -
      radius
    );
  }

  function sphereSDF(x, y, z, radius) {
    return length3(x, y, z) - radius;
  }

  function texture(x, y) {
    return { type: "t", x, y };
  }

  // Optimized noise function
  function noise(x, y, time) {
    const sin1 = Math.sin(x * 8 + time);
    const cos1 = Math.cos(y * 6 + time * 0.7);
    return sin1 * cos1 * 0.08;
  }

  // Throttle function for performance
  function throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;
    return function (...args) {
      const currentTime = Date.now();

      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }

  // Enhanced lighting calculation
  function calculateLighting(normal, lightDir, viewDir) {
    const diffuse = Math.max(
      0,
      normal.x * lightDir.x + normal.y * lightDir.y + normal.z * lightDir.z
    );
    const reflect = {
      x: 2 * diffuse * normal.x - lightDir.x,
      y: 2 * diffuse * normal.y - lightDir.y,
      z: 2 * diffuse * normal.z - lightDir.z,
    };
    const specular = Math.pow(
      Math.max(
        0,
        reflect.x * viewDir.x + reflect.y * viewDir.y + reflect.z * viewDir.z
      ),
      32
    );
    return { diffuse, specular };
  }

  // Generate unique ID
  function generateId() {
    return "liquid-glass-" + Math.random().toString(36).substr(2, 9);
  }

  // Main Shader class with enhanced 3D effects and performance optimization
  class Shader {
    constructor(options = {}) {
      this.width = options.width || 100;
      this.height = options.height || 100;
      this.fragment = options.fragment || ((uv) => texture(uv.x, uv.y));
      this.canvasDPI = 1;
      this.id = generateId();
      this.offset = 10; // Viewport boundary offset
      this.time = 0;

      this.mouse = { x: 0.5, y: 0.5 };
      this.mouseUsed = false;
      this.isDragging = false;
      this.needsUpdate = true;
      this.lastUpdateTime = 0;

      // Position state for pure transform positioning
      this.position = { x: 0, y: 0 }; // Center position relative to viewport center
      this.dragStart = { x: 0, y: 0 };
      this.initialPosition = { x: 0, y: 0 };

      // Performance optimization flags
      this.isVisible = true;
      this.reducedMotion = false;

      this.createElement();
      this.setupEventListeners();
      this.startAnimation();
      this.updateShader();

      // Create throttled update function
      this.throttledUpdate = throttle(() => {
        if (this.needsUpdate) {
          this.updateShader();
          this.needsUpdate = false;
        }
      }, 16); // ~60fps
    }

    createElement() {
      // Create container with pure transform positioning
      this.container = document.createElement("div");
      this.container.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          width: ${this.width}px;
          height: ${this.height}px;
          overflow: hidden;
          border-radius: 150px;
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

      // Set initial transform
      this.updateTransform();

      // Add hover effect with performance optimization
      this.container.addEventListener("mouseenter", () => {
        if (!this.isDragging) {
          this.setTransform(
            this.position.x,
            this.position.y,
            "rotateX(3deg) rotateY(-2deg) scale(1.02)"
          ); // Reduced hover scale
        }
      });

      this.container.addEventListener("mouseleave", () => {
        if (!this.isDragging) {
          this.setTransform(
            this.position.x,
            this.position.y,
            "rotateX(2deg) rotateY(-1deg)"
          );
        }
      });

      // Create SVG filter with enhanced effects
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

      // Main distortion filter
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

      // Simplified turbulence for better performance
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

      // Combine displacement with turbulence
      const feComposite = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "feComposite"
      );
      feComposite.setAttribute("in", "displacementMap");
      feComposite.setAttribute("in2", "turbulence");
      feComposite.setAttribute("operator", "screen");
      feComposite.setAttribute("result", "combinedDisplacement");

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

      // Create canvas for displacement map (hidden)
      this.canvas = document.createElement("canvas");
      this.canvas.width = this.width * this.canvasDPI;
      this.canvas.height = this.height * this.canvasDPI;
      this.canvas.style.display = "none";

      this.context = this.canvas.getContext("2d");
    }

    // Pure transform positioning methods
    setTransform(x, y, additional = "") {
      const perspective = "perspective(1500px)"; // Increased for less distortion
      const translate = `translate3d(${x - this.width / 2}px, ${
        y - this.height / 2
      }px, 0)`;
      const baseTransform = additional || "rotateX(2deg) rotateY(-1deg)"; // Reduced rotation
      this.container.style.transform = `${perspective} ${translate} ${baseTransform}`;
    }

    updateTransform() {
      if (this.isDragging) {
        this.setTransform(
          this.position.x,
          this.position.y,
          "rotateX(3deg) rotateY(-2deg) scale(0.995)"
        ); // Minimal scale change
      } else {
        this.setTransform(
          this.position.x,
          this.position.y,
          "rotateX(2deg) rotateY(-1deg)"
        );
      }
    }

    constrainPosition(x, y) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Calculate boundaries with offset (relative to viewport center)
      const minX = -viewportWidth / 2 + this.width / 2 + this.offset;
      const maxX = viewportWidth / 2 - this.width / 2 - this.offset;
      const minY = -viewportHeight / 2 + this.height / 2 + this.offset;
      const maxY = viewportHeight / 2 - this.height / 2 - this.offset;

      // Constrain position
      const constrainedX = Math.max(minX, Math.min(maxX, x));
      const constrainedY = Math.max(minY, Math.min(maxY, y));

      return { x: constrainedX, y: constrainedY };
    }

    startAnimation() {
      let lastTime = 0;
      const animate = (currentTime) => {
        const deltaTime = currentTime - lastTime;

        // Limit to 60fps max and skip frames if needed
        if (deltaTime >= 16.67) {
          this.time += deltaTime * 0.001;
          this.needsUpdate = true;

          // Only update if not dragging or at reduced frequency
          if (!this.isDragging) {
            this.throttledUpdate();
          }

          lastTime = currentTime;
        }

        this.animationFrame = requestAnimationFrame(animate);
      };
      animate(0);
    }

    setupEventListeners() {
      this.container.addEventListener("mousedown", (e) => {
        this.isDragging = true;
        this.container.style.cursor = "grabbing";

        // Record drag start position
        this.dragStart.x = e.clientX;
        this.dragStart.y = e.clientY;
        this.initialPosition.x = this.position.x;
        this.initialPosition.y = this.position.y;

        // Apply drag transform
        this.updateTransform();

        e.preventDefault();
      });

      // Throttle mouse move events during drag
      const throttledMouseMove = throttle((e) => {
        if (this.isDragging) {
          // Calculate delta from drag start
          const deltaX = e.clientX - this.dragStart.x;
          const deltaY = e.clientY - this.dragStart.y;

          // Calculate new position (relative to viewport center)
          const newX = this.initialPosition.x + deltaX;
          const newY = this.initialPosition.y + deltaY;

          // Constrain position within viewport bounds
          const constrained = this.constrainPosition(newX, newY);
          this.position.x = constrained.x;
          this.position.y = constrained.y;

          // Update transform
          this.updateTransform();
        }

        // Update mouse position for shader (less frequently)
        const rect = this.container.getBoundingClientRect();
        const newMouseX = (e.clientX - rect.left) / rect.width;
        const newMouseY = (e.clientY - rect.top) / rect.height;

        // Only update if significantly changed
        if (
          Math.abs(newMouseX - this.mouse.x) > 0.01 ||
          Math.abs(newMouseY - this.mouse.y) > 0.01
        ) {
          this.mouse.x = newMouseX;
          this.mouse.y = newMouseY;
          this.needsUpdate = true;
        }
      }, 8); // Higher frequency for drag smoothness

      document.addEventListener("mousemove", throttledMouseMove);

      document.addEventListener("mouseup", () => {
        if (this.isDragging) {
          this.isDragging = false;
          this.container.style.cursor = "grab";

          // Update final transform
          this.updateTransform();

          this.needsUpdate = true;
          this.throttledUpdate();
        }
      });

      // Handle window resize to maintain constraints
      window.addEventListener(
        "resize",
        throttle(() => {
          const constrained = this.constrainPosition(
            this.position.x,
            this.position.y
          );
          this.position.x = constrained.x;
          this.position.y = constrained.y;
          this.updateTransform();
        }, 100)
      );

      // Pause animation when tab is not visible
      document.addEventListener("visibilitychange", () => {
        this.isVisible = !document.hidden;
      });
    }

    updateShader() {
      // Skip update if not visible or high frequency
      if (!this.isVisible) return;

      const mouseProxy = new Proxy(this.mouse, {
        get: (target, prop) => {
          this.mouseUsed = true;
          return target[prop];
        },
      });

      this.mouseUsed = false;

      const w = this.width * this.canvasDPI;
      const h = this.height * this.canvasDPI;
      const data = new Uint8ClampedArray(w * h * 4);

      let maxScale = 0;
      const rawValues = [];

      // Simplified calculation for better performance
      const step = this.isDragging ? 2 : 1; // Lower quality during drag

      for (let i = 0; i < data.length; i += 4 * step) {
        const x = (i / 4) % w;
        const y = Math.floor(i / 4 / w);
        const pos = this.fragment(
          { x: x / w, y: y / h },
          mouseProxy,
          this.time
        );
        const dx = pos.x * w - x;
        const dy = pos.y * h - y;
        maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy));
        rawValues.push(dx, dy);

        // Fill skipped pixels during drag
        if (step > 1) {
          for (let j = 1; j < step && i + j * 4 < data.length; j++) {
            rawValues.push(dx, dy);
          }
        }
      }

      maxScale *= 0.6; // Reduced displacement scale for smoother performance

      let index = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = rawValues[index++] / maxScale + 0.5;
        const g = rawValues[index++] / maxScale + 0.5;
        data[i] = r * 255;
        data[i + 1] = g * 255;
        data[i + 2] = 120; // Reduced blue channel calculation
        data[i + 3] = 255;
      }

      this.context.putImageData(new ImageData(data, w, h), 0, 0);
      this.feImage.setAttributeNS(
        "http://www.w3.org/1999/xlink",
        "href",
        this.canvas.toDataURL()
      );
      this.feDisplacementMap.setAttribute(
        "scale",
        ((maxScale / this.canvasDPI) * 1.3).toString()
      );
    }

    appendTo(parent) {
      parent.appendChild(this.svg);
      parent.appendChild(this.container);
    }

    destroy() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
      this.svg.remove();
      this.container.remove();
      this.canvas.remove();
    }
  }

  // Create the enhanced liquid glass effect
  function createLiquidGlass() {
    // Create shader with enhanced 3D fragment shader
    const shader = new Shader({
      width: 320,
      height: 240,
      fragment: (uv, mouse, time) => {
        const ix = uv.x - 0.5;
        const iy = uv.y - 0.5;

        // Enhanced SDF with 3D perspective
        const distanceToEdge = roundedRectSDF(ix, iy, 0.32, 0.22, 0.6);

        // Optimized mouse interaction
        const mouseInfluence = length(
          ix - (mouse.x - 0.5),
          iy - (mouse.y - 0.5)
        );
        const mouseEffect = smoothStep(0.25, 0, mouseInfluence) * 0.6;

        // Simplified organic movement
        const organicX = noise(ix * 1.5, iy * 1.5, time * 1.5) * 0.25;
        const organicY = noise(ix * 1.2, iy * 1.8, time * 1.2) * 0.25;

        // Enhanced displacement calculation
        const displacement = smoothStep(0.85, 0, distanceToEdge - 0.08);
        const scaled = smoothStep(0, 1, displacement * (1 + mouseEffect));

        // Simplified 3D perspective transformation
        const perspective = 1 + iy * 0.15; // Reduced depth perspective
        const rotationX = Math.cos(time * 0.4) * 0.015;
        const rotationY = Math.sin(time * 0.25) * 0.015;

        // Combined transformation
        const finalX = ix * scaled * perspective + organicX + rotationX + 0.5;
        const finalY = iy * scaled * perspective + organicY + rotationY + 0.5;

        return texture(finalX, finalY);
      },
    });

    // Add to page
    shader.appendTo(document.body);

    console.log(
      "Enhanced 3D Liquid Glass effect created! (Performance Optimized)"
    );
    console.log(
      "Features: 3D perspective, dynamic lighting, organic movement, enhanced shadows"
    );
    console.log(
      "Optimizations: Throttled updates, reduced calculations during drag, frame limiting"
    );

    // Return shader instance so it can be removed if needed
    window.liquidGlass = shader;
  }

  // Initialize
  createLiquidGlass();
})();
