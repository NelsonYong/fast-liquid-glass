// Optimized Web Worker for Liquid Glass using Rust WASM Engine
// Handles all computation in WASM, minimal JavaScript overhead

let wasmModule = null;
let GlassState = null;
let PerformanceMonitor = null;
let glassState = null;
let performanceMonitor = null;
let isInitialized = false;

// Initialize WASM module with fallback
async function initWasm() {
  try {
    // Method 1: Try importScripts first (most compatible)
    try {
      importScripts("./pkg/liquid_glass_wasm.js");

      console.log("🦀 WASM script loaded via importScripts");

      // Initialize the WASM module
      if (typeof __wbg_init !== "undefined") {
        await __wbg_init("./pkg/liquid_glass_wasm_bg.wasm");
        console.log("🦀 WASM initialized");
      }

      // Check if classes are available in global scope
      if (
        typeof GlassState !== "undefined" &&
        typeof PerformanceMonitor !== "undefined"
      ) {
        wasmModule = {
          GlassState: GlassState,
          PerformanceMonitor: PerformanceMonitor,
          compute_shader_with_state: compute_shader_with_state,
          calculate_transform_matrix: calculate_transform_matrix,
          default: __wbg_init,
        };
        console.log("🦀 WASM classes found in global scope");
      } else {
        throw new Error(
          "WASM classes not found in global scope after importScripts"
        );
      }
    } catch (importScriptsError) {
      console.warn(
        "importScripts failed, trying dynamic import:",
        importScriptsError
      );

      // Method 2: Fallback to dynamic import (if running as module)
      try {
        wasmModule = await import("./pkg/liquid_glass_wasm.js");

        // Initialize the WASM module
        await wasmModule.default("./pkg/liquid_glass_wasm_bg.wasm");

        console.log("🦀 WASM loaded via dynamic import");
      } catch (dynamicImportError) {
        console.error("Dynamic import also failed:", dynamicImportError);
        throw new Error(
          `Both importScripts and dynamic import failed. ImportScripts: ${importScriptsError.message}, Dynamic: ${dynamicImportError.message}`
        );
      }
    }

    // Extract classes from the module
    GlassState = wasmModule.GlassState;
    PerformanceMonitor = wasmModule.PerformanceMonitor;

    // Validate that we have the required classes and functions
    if (!GlassState || !PerformanceMonitor) {
      throw new Error(
        "Required WASM classes not found: GlassState or PerformanceMonitor missing"
      );
    }

    if (
      !wasmModule.compute_shader_with_state ||
      !wasmModule.calculate_transform_matrix
    ) {
      throw new Error(
        "Required WASM functions not found: compute_shader_with_state or calculate_transform_matrix missing"
      );
    }

    isInitialized = true;

    console.log("🦀 WASM Engine fully initialized in worker");

    // Notify main thread that worker is ready
    self.postMessage({
      type: "init-complete",
      data: { success: true },
    });
  } catch (error) {
    console.error("Failed to initialize WASM:", error);
    self.postMessage({
      type: "init-complete",
      data: { success: false, error: error.message },
    });
  }
}

// Handle messages from main thread
self.onmessage = async function (e) {
  const { type, data } = e.data;

  switch (type) {
    case "init":
      await initWasm();
      break;

    case "create-state":
      if (!isInitialized || !GlassState || !PerformanceMonitor) {
        self.postMessage({
          type: "error",
          error: "WASM not initialized or classes not available",
        });
        return;
      }

      try {
        const { width, height } = data;
        glassState = new GlassState(width, height);
        performanceMonitor = new PerformanceMonitor();

        self.postMessage({
          type: "state-created",
          success: true,
        });
      } catch (error) {
        console.error("Error creating state:", error);
        self.postMessage({
          type: "error",
          error: error.message,
        });
      }
      break;

    case "update-viewport":
      if (glassState) {
        try {
          const { width, height } = data;
          glassState.update_viewport(width, height);
        } catch (error) {
          console.error("Error updating viewport:", error);
        }
      }
      break;

    case "start-drag":
      if (glassState) {
        try {
          const { mouseX, mouseY } = data;
          glassState.start_drag(mouseX, mouseY);
        } catch (error) {
          console.error("Error starting drag:", error);
        }
      }
      break;

    case "update-drag":
      if (glassState) {
        try {
          const { mouseX, mouseY } = data;
          glassState.update_drag(mouseX, mouseY);
        } catch (error) {
          console.error("Error updating drag:", error);
        }
      }
      break;

    case "stop-drag":
      if (glassState) {
        try {
          glassState.stop_drag();
        } catch (error) {
          console.error("Error stopping drag:", error);
        }
      }
      break;

    case "update-mouse":
      if (glassState) {
        try {
          const { x, y } = data;
          glassState.update_mouse(x, y);
        } catch (error) {
          console.error("Error updating mouse:", error);
        }
      }
      break;

    case "compute-frame":
      if (!isInitialized || !glassState || !wasmModule) {
        self.postMessage({
          type: "frame-result",
          error: "WASM not ready",
        });
        return;
      }

      try {
        const {
          width,
          height,
          deltaTime,
          currentTime,
          isDragging = false,
        } = data;

        // Update animation time (slower during drag for better responsiveness)
        const timeScale = isDragging ? 0.5 : 1.0;
        glassState.update_time(deltaTime * 0.001 * timeScale);

        // Update performance monitor
        if (performanceMonitor) {
          performanceMonitor.update(currentTime);
        }

        // Create output buffer
        const bufferSize = width * height * 4;
        const outputBuffer = new Uint8Array(bufferSize);

        // Compute shader using WASM state
        const maxScale = wasmModule.compute_shader_with_state(
          glassState,
          width,
          height,
          outputBuffer
        );

        // Get current state
        const positionX = glassState.get_position_x();
        const positionY = glassState.get_position_y();
        const dragState = glassState.is_dragging();

        // Calculate transform matrix
        const transformMatrix = wasmModule.calculate_transform_matrix(
          positionX,
          positionY,
          width,
          height,
          dragState,
          false
        );

        // Send result back to main thread
        self.postMessage(
          {
            type: "frame-result",
            data: {
              imageData: outputBuffer,
              maxScale: maxScale,
              transformMatrix: transformMatrix,
              positionX: positionX,
              positionY: positionY,
              isDragging: dragState,
              fps: performanceMonitor ? performanceMonitor.get_fps() : 0,
            },
          },
          [outputBuffer.buffer]
        ); // Transfer ownership for performance
      } catch (error) {
        console.error("Frame computation error:", error);
        self.postMessage({
          type: "frame-result",
          error: error.message,
        });
      }
      break;

    default:
      console.warn("Unknown message type:", type);
  }
};

// Handle worker errors
self.onerror = function (error) {
  console.error("Worker error:", error);
  self.postMessage({
    type: "error",
    error: error.message,
  });
};

// Handle unhandled promise rejections
self.onunhandledrejection = function (event) {
  console.error("Unhandled promise rejection in worker:", event.reason);
  self.postMessage({
    type: "error",
    error: event.reason ? event.reason.toString() : "Unknown promise rejection",
  });
};

// Auto-initialize when worker starts
initWasm();
