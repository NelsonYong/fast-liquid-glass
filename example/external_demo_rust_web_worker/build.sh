#!/bin/bash

# Build script for Liquid Glass WASM optimization
# This script compiles Rust to WASM and sets up the necessary files

set -e

echo "🦀 Building Liquid Glass WASM module..."

# Check if wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo "❌ wasm-pack is not installed. Installing..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

# Build the WASM module
echo "📦 Compiling Rust to WASM..."
wasm-pack build --target web --out-dir pkg --dev

# Optimize for production
if [ "$1" = "--release" ]; then
    echo "🚀 Building optimized release version..."
    wasm-pack build --target web --out-dir pkg --release
    
    # Further optimize with wasm-opt if available
    if command -v wasm-opt &> /dev/null; then
        echo "⚡ Optimizing WASM binary..."
        wasm-opt -O4 -o pkg/liquid_glass_wasm_bg.wasm pkg/liquid_glass_wasm_bg.wasm
    fi
fi

echo "✅ WASM module built successfully!"
echo "📁 Output directory: ./pkg/"
echo ""
echo "🔧 Files generated:"
echo "   - liquid_glass_wasm.js (JavaScript bindings)"
echo "   - liquid_glass_wasm_bg.wasm (WebAssembly binary)"
echo "   - liquid_glass_wasm.d.ts (TypeScript definitions)"
echo ""
echo "🚀 You can now use the optimized liquid glass effect!"
echo "   Open index.html in a web server to test the performance improvements." 