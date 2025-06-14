use wasm_bindgen::prelude::*;
use js_sys::Float32Array;
use std::f64::consts::PI;

// Set up wee_alloc as the global allocator for smaller WASM size
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

// Console logging for debugging
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

// Glass state structure
#[wasm_bindgen]
pub struct GlassState {
    // Position and movement
    position_x: f64,
    position_y: f64,
    drag_start_x: f64,
    drag_start_y: f64,
    initial_position_x: f64,
    initial_position_y: f64,
    
    // Mouse state
    mouse_x: f64,
    mouse_y: f64,
    is_dragging: bool,
    
    // Viewport constraints
    viewport_width: f64,
    viewport_height: f64,
    glass_width: f64,
    glass_height: f64,
    offset: f64,
    
    // Animation state
    time: f64,
}

#[wasm_bindgen]
impl GlassState {
    #[wasm_bindgen(constructor)]
    pub fn new(glass_width: f64, glass_height: f64) -> GlassState {
        GlassState {
            position_x: 0.0,
            position_y: 0.0,
            drag_start_x: 0.0,
            drag_start_y: 0.0,
            initial_position_x: 0.0,
            initial_position_y: 0.0,
            mouse_x: 0.5,
            mouse_y: 0.5,
            is_dragging: false,
            viewport_width: 1920.0,
            viewport_height: 1080.0,
            glass_width,
            glass_height,
            offset: 10.0,
            time: 0.0,
        }
    }
    
    // Update viewport size
    #[wasm_bindgen]
    pub fn update_viewport(&mut self, width: f64, height: f64) {
        self.viewport_width = width;
        self.viewport_height = height;
        self.constrain_position();
    }
    
    // Start dragging
    #[wasm_bindgen]
    pub fn start_drag(&mut self, mouse_x: f64, mouse_y: f64) {
        self.is_dragging = true;
        self.drag_start_x = mouse_x;
        self.drag_start_y = mouse_y;
        self.initial_position_x = self.position_x;
        self.initial_position_y = self.position_y;
    }
    
    // Update drag position
    #[wasm_bindgen]
    pub fn update_drag(&mut self, mouse_x: f64, mouse_y: f64) {
        if self.is_dragging {
            let delta_x = mouse_x - self.drag_start_x;
            let delta_y = mouse_y - self.drag_start_y;
            
            self.position_x = self.initial_position_x + delta_x;
            self.position_y = self.initial_position_y + delta_y;
            
            self.constrain_position();
        }
    }
    
    // Stop dragging
    #[wasm_bindgen]
    pub fn stop_drag(&mut self) {
        self.is_dragging = false;
    }
    
    // Update mouse position for shader
    #[wasm_bindgen]
    pub fn update_mouse(&mut self, x: f64, y: f64) {
        self.mouse_x = x;
        self.mouse_y = y;
    }
    
    // Update animation time
    #[wasm_bindgen]
    pub fn update_time(&mut self, delta_time: f64) {
        self.time += delta_time;
    }
    
    // Get current position
    #[wasm_bindgen]
    pub fn get_position_x(&self) -> f64 { self.position_x }
    
    #[wasm_bindgen]
    pub fn get_position_y(&self) -> f64 { self.position_y }
    
    #[wasm_bindgen]
    pub fn is_dragging(&self) -> bool { self.is_dragging }
    
    // Constrain position within viewport
    fn constrain_position(&mut self) {
        let min_x = -self.viewport_width / 2.0 + self.glass_width / 2.0 + self.offset;
        let max_x = self.viewport_width / 2.0 - self.glass_width / 2.0 - self.offset;
        let min_y = -self.viewport_height / 2.0 + self.glass_height / 2.0 + self.offset;
        let max_y = self.viewport_height / 2.0 - self.glass_height / 2.0 - self.offset;
        
        self.position_x = self.position_x.max(min_x).min(max_x);
        self.position_y = self.position_y.max(min_y).min(max_y);
    }
}

// Utility functions
#[inline]
fn smooth_step(a: f64, b: f64, t: f64) -> f64 {
    let t = ((t - a) / (b - a)).max(0.0).min(1.0);
    t * t * (3.0 - 2.0 * t)
}

#[inline]
fn length(x: f64, y: f64) -> f64 {
    (x * x + y * y).sqrt()
}

#[inline]
fn rounded_rect_sdf(x: f64, y: f64, width: f64, height: f64, radius: f64) -> f64 {
    let qx = x.abs() - width + radius;
    let qy = y.abs() - height + radius;
    qx.max(qy).min(0.0) + length(qx.max(0.0), qy.max(0.0)) - radius
}

#[inline]
fn noise(x: f64, y: f64, time: f64) -> f64 {
    let sin1 = (x * 8.0 + time).sin();
    let cos1 = (y * 6.0 + time * 0.7).cos();
    sin1 * cos1 * 0.08
}

// Optimized fragment shader calculation
#[inline]
fn fragment_shader(
    uv_x: f64, 
    uv_y: f64, 
    mouse_x: f64, 
    mouse_y: f64, 
    time: f64
) -> (f64, f64) {
    let ix = uv_x - 0.5;
    let iy = uv_y - 0.5;
    
    // Enhanced SDF with 3D perspective
    let distance_to_edge = rounded_rect_sdf(ix, iy, 0.32, 0.22, 0.6);
    
    // Optimized mouse interaction
    let mouse_influence = length(ix - (mouse_x - 0.5), iy - (mouse_y - 0.5));
    let mouse_effect = smooth_step(0.25, 0.0, mouse_influence) * 0.6;
    
    // Simplified organic movement
    let organic_x = noise(ix * 1.5, iy * 1.5, time * 1.5) * 0.25;
    let organic_y = noise(ix * 1.2, iy * 1.8, time * 1.2) * 0.25;
    
    // Enhanced displacement calculation
    let displacement = smooth_step(0.85, 0.0, distance_to_edge - 0.08);
    let scaled = smooth_step(0.0, 1.0, displacement * (1.0 + mouse_effect));
    
    // Simplified 3D perspective transformation
    let perspective = 1.0 + (iy * 0.15);
    let rotation_x = (time * 0.4).cos() * 0.015;
    let rotation_y = (time * 0.25).sin() * 0.015;
    
    // Combined transformation
    let final_x = ix * scaled * perspective + organic_x + rotation_x + 0.5;
    let final_y = iy * scaled * perspective + organic_y + rotation_y + 0.5;
    
    (final_x, final_y)
}

// Transform calculation functions
#[wasm_bindgen]
pub fn calculate_transform_matrix(
    position_x: f64,
    position_y: f64,
    glass_width: f64,
    glass_height: f64,
    is_dragging: bool,
    is_hovering: bool
) -> String {
    let perspective = "perspective(1500px)";
    let translate = format!("translate3d({}px, {}px, 0)", 
        position_x - glass_width / 2.0, 
        position_y - glass_height / 2.0);
    
    let transform = if is_dragging {
        "rotateX(3deg) rotateY(-2deg) scale(0.995)"
    } else if is_hovering {
        "rotateX(3deg) rotateY(-2deg) scale(1.02)"
    } else {
        "rotateX(2deg) rotateY(-1deg)"
    };
    
    format!("{} {} {}", perspective, translate, transform)
}

// Main shader computation function
#[wasm_bindgen]
pub fn compute_shader_with_state(
    state: &GlassState,
    width: u32,
    height: u32,
    output: &mut [u8]
) -> f64 {
    let w = width as usize;
    let h = height as usize;
    let mut max_scale = 0.0f64;
    let mut raw_values = Vec::with_capacity(w * h * 2);
    
    // Adaptive quality based on dragging state
    let step = if state.is_dragging { 2 } else { 1 };
    
    // First pass: calculate displacements
    for y in (0..h).step_by(step) {
        for x in (0..w).step_by(step) {
            let uv_x = x as f64 / w as f64;
            let uv_y = y as f64 / h as f64;
            
            let (final_x, final_y) = fragment_shader(
                uv_x, uv_y, 
                state.mouse_x, state.mouse_y, 
                state.time
            );
            
            let dx = final_x * w as f64 - x as f64;
            let dy = final_y * h as f64 - y as f64;
            
            max_scale = max_scale.max(dx.abs()).max(dy.abs());
            
            // Fill the step area with the same values
            for _ in 0..(step * step) {
                raw_values.push(dx);
                raw_values.push(dy);
            }
        }
    }
    
    max_scale *= 0.6; // Scale factor
    
    // Second pass: normalize and write to output
    let mut index = 0;
    for i in (0..output.len()).step_by(4) {
        if index + 1 < raw_values.len() {
            let r = (raw_values[index] / max_scale + 0.5) * 255.0;
            let g = (raw_values[index + 1] / max_scale + 0.5) * 255.0;
            
            output[i] = r.max(0.0).min(255.0) as u8;
            output[i + 1] = g.max(0.0).min(255.0) as u8;
            output[i + 2] = 120; // Blue channel
            output[i + 3] = 255; // Alpha
            
            index += 2;
        }
    }
    
    max_scale
}

// Utility functions for JavaScript
#[wasm_bindgen]
pub fn throttle_should_update(last_time: f64, current_time: f64, delay: f64) -> bool {
    current_time - last_time >= delay
}

#[wasm_bindgen]
pub fn calculate_mouse_delta(mouse_x: f64, mouse_y: f64, old_x: f64, old_y: f64) -> f64 {
    let dx = mouse_x - old_x;
    let dy = mouse_y - old_y;
    (dx * dx + dy * dy).sqrt()
}

// Performance monitoring
#[wasm_bindgen]
pub struct PerformanceMonitor {
    frame_count: u32,
    total_time: f64,
    last_fps_check: f64,
    current_fps: f64,
}

#[wasm_bindgen]
impl PerformanceMonitor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> PerformanceMonitor {
        PerformanceMonitor {
            frame_count: 0,
            total_time: 0.0,
            last_fps_check: 0.0,
            current_fps: 0.0,
        }
    }
    
    #[wasm_bindgen]
    pub fn update(&mut self, current_time: f64) {
        self.frame_count += 1;
        self.total_time = current_time;
        
        if current_time - self.last_fps_check >= 1000.0 {
            self.current_fps = self.frame_count as f64 / (current_time - self.last_fps_check) * 1000.0;
            self.frame_count = 0;
            self.last_fps_check = current_time;
        }
    }
    
    #[wasm_bindgen]
    pub fn get_fps(&self) -> f64 {
        self.current_fps
    }
}

// Initialize WASM module
#[wasm_bindgen(start)]
pub fn main() {
    console_log!("🦀 Liquid Glass WASM Engine initialized!");
    console_log!("🚀 All calculations running in optimized Rust code");
} 