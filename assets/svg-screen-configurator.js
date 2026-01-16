/**
 * SVG Screen Configurator
 * Handles dynamic updates to the SVG screen preview based on configurator state.
 *
 * Features:
 * - Updates SVG viewBox proportionally based on width/height
 * - Changes colors based on frame and fabric color selections
 * - Syncs with product-configurator-v2.js via custom events
 * - Smooth CSS transitions for all changes
 * - Draws Cassette with distinct End Caps to preserve corner gradients (Figma accuracy)
 */

(function () {
  'use strict';

  class SVGScreenConfigurator {
    constructor() {
      this.container = null;
      this.svg = null;
      this.initialized = false;

      // FIXED FIGMA DIMENSIONS (Pixels)
      this.CASSETTE_HEIGHT = 64;
      this.CORNER_RADIUS = 10;
      this.END_CAP_WIDTH = 10; // Left/Right container width
      this.RAIL_WIDTH = 26;
      this.BOTTOM_PLATE_HEIGHT = 16;
      this.TOP_BAR_HEIGHT = 8; // Decorative top bar height

      // Conversion: 1mm = 0.3px (Visual Scale)
      // 1500mm -> 450px width.
      // This ensures the fixed components (64px height) look proportional to the screen size
      this.PX_PER_MM = 0.3;

      this.init();
    }

    init() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setup());
      } else {
        this.setup();
      }
    }

    setup() {
      this.container = document.getElementById('svg-screen-configurator');
      if (!this.container) {
        this.observeForContainer();
        return;
      }

      this.svg = this.container.querySelector('.configurator-svg');
      if (!this.svg) return;

      this.initialized = true;
      this.bindEvents();

      // Initial sync
      this.syncWithConfigurator();

      // If sync didn't find data (empty state), render default
      const current = this.getCurrentState();
      if (!current.width) {
        this.updateFromState(this.getDefaultState());
      }

      console.log('SVG Screen Configurator: Initialized with Accurate Shapes');
    }

    observeForContainer() {
      const observer = new MutationObserver((mutations, obs) => {
        const container = document.getElementById('svg-screen-configurator');
        if (container) {
          obs.disconnect();
          this.setup();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    getDefaultState() {
      return {
        width: 1500,
        height: 1000,
        frameColor: 'anthracite',
        fabricColor: 'charcoal',
        fabricType: '4-percent',
      };
    }

    bindEvents() {
      document.addEventListener('screenlux:screen-updated', (event) => {
        if (event.detail) this.updateFromState(event.detail);
      });

      document.addEventListener('screenlux:configurator-ready', () => {
        this.syncWithConfigurator();
      });

      // Direct input monitoring as backup
      document.addEventListener('change', (event) => {
        if (event.target.matches('[data-field="width"], [data-field="height"]')) {
          this.handleDimensionChange(event);
        }
        if (event.target.matches('[data-field="frameColor"], [data-field="fabricColor"], [data-field="fabricType"]')) {
          this.handleColorChange(event);
        }
      });
    }

    handleDimensionChange(event) {
      const field = event.target.dataset.field;
      const value = parseInt(event.target.value) || 0;
      const state = this.getCurrentState();
      state[field] = value;
      this.updateFromState(state);
    }

    handleColorChange(event) {
      const field = event.target.dataset.field;
      const value = event.target.value;
      const state = this.getCurrentState();
      state[field] = value;
      this.updateFromState(state);
    }

    getCurrentState() {
      return {
        width: parseInt(this.container.dataset.width) || 1500,
        height: parseInt(this.container.dataset.height) || 1000,
        frameColor: this.container.dataset.frameColor || 'anthracite',
        fabricColor: this.container.dataset.fabricColor || 'charcoal',
        fabricType: this.container.dataset.fabricType || '4-percent',
      };
    }

    syncWithConfigurator() {
      const configurator = document.querySelector('product-configurator');
      if (configurator && configurator.state && configurator.state.screens && configurator.state.screens.length > 0) {
        const firstScreen = configurator.state.screens[0];
        this.updateFromState({
          width: firstScreen.width || 1500,
          height: firstScreen.height || 1000,
          frameColor: firstScreen.frameColor || 'anthracite',
          fabricColor: firstScreen.fabricColor || 'charcoal',
          fabricType: firstScreen.fabricType || '4-percent',
        });
      }
    }

    updateFromState(state) {
      if (!this.initialized) return;

      const { width, height, frameColor, fabricColor, fabricType } = state;

      this.container.dataset.width = width;
      this.container.dataset.height = height;
      this.container.dataset.frameColor = frameColor;
      this.container.dataset.fabricColor = fabricColor;
      this.container.dataset.fabricType = fabricType;

      this.updateColors(frameColor, fabricColor, fabricType);
      this.renderSVG(width, height);
      this.updateDimensionLabels(width, height);
    }

    updateDimensionLabels(width, height) {
      const widthLabel = this.container.querySelector('[data-dimension="width"]');
      const heightLabel = this.container.querySelector('[data-dimension="height"]');
      if (widthLabel) widthLabel.textContent = width;
      if (heightLabel) heightLabel.textContent = height;
    }

    updateColors(frameColor, fabricColor, fabricType) {
      const data = window.ScreenluxData;

      // Update Frame Color Vars
      if (data && data.frameColors) {
        const frame = data.frameColors.find((f) => f.id === frameColor);
        if (frame && frame.hex) {
          this.container.style.setProperty('--frame-color', frame.hex);
          this.container.style.setProperty('--frame-dark', this.shiftColor(frame.hex, -20));
          this.container.style.setProperty('--frame-darker', this.shiftColor(frame.hex, -40));
          this.container.style.setProperty('--frame-light', this.shiftColor(frame.hex, 20));
        }
      }

      // Update Fabric Color Vars
      if (data && data.fabricColors) {
        const fabric = data.fabricColors.find((f) => f.id === fabricColor);
        if (fabric && fabric.hex) {
          this.container.style.setProperty('--fabric-color', fabric.hex);
        }
      }

      // Opacity for openness
      const fabricElement = this.svg.querySelector('.fabric-rect');
      if (fabricElement) {
        fabricElement.style.opacity = fabricType === 'blackout' ? '1' : '0.92';
      }
    }

    // Helper to darken/lighten hex
    shiftColor(hex, percent) {
      hex = hex.replace('#', '');
      let r = parseInt(hex.substring(0, 2), 16);
      let g = parseInt(hex.substring(2, 4), 16);
      let b = parseInt(hex.substring(4, 6), 16);

      if (percent > 0) {
        // Lighten
        r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
        g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
        b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));
      } else {
        // Darken
        const p = Math.abs(percent);
        r = Math.max(0, Math.floor((r * (100 - p)) / 100));
        g = Math.max(0, Math.floor((g * (100 - p)) / 100));
        b = Math.max(0, Math.floor((b * (100 - p)) / 100));
      }

      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    renderSVG(widthMM, heightMM) {
      // 1. Calculate SVG Visual Dimensions (Pixels)
      const svgWidth = Math.max(widthMM * this.PX_PER_MM, 240); // Min width to prevent collapse
      const svgHeight = Math.max(heightMM * this.PX_PER_MM, 200);

      // 2. Fixed Component Dimensions (Pixels)
      const H_CASSETTE = this.CASSETTE_HEIGHT;
      const W_RAIL = this.RAIL_WIDTH;
      const H_BOTTOM = this.BOTTOM_PLATE_HEIGHT;
      const R_CORNER = this.CORNER_RADIUS;
      const W_ENDCAP = this.END_CAP_WIDTH;

      // 3. Derived Dimensions
      const fabricWidth = svgWidth - W_RAIL * 2;
      const railHeight = svgHeight - H_CASSETTE;
      const fabricHeight = railHeight - H_BOTTOM;
      const middleWidth = svgWidth - W_ENDCAP * 2; // For cassette middle section

      // 4. Update ViewBox to fit new geometry + padding
      const padding = 20;
      this.svg.setAttribute('viewBox', `0 0 ${svgWidth + padding * 2} ${svgHeight + padding * 2}`);

      // 5. Construct Groups
      // We use a group transform to handle padding
      this.svg.innerHTML = `
        <defs>
           <!-- 1. Corner Gradients (Radial) - Metallic Look -->
           <radialGradient id="cornerGradientLeft" cx="100%" cy="100%" r="100%" fx="100%" fy="100%">
             <stop offset="50%" stop-color="var(--frame-color, #454545)" />
             <stop offset="75%" stop-color="var(--frame-dark, #353535)" />
             <stop offset="100%" stop-color="var(--frame-darker, #242424)" />
           </radialGradient>

           <radialGradient id="cornerGradientRight" cx="0%" cy="100%" r="100%" fx="0%" fy="100%">
             <stop offset="50%" stop-color="var(--frame-color, #454545)" />
             <stop offset="75%" stop-color="var(--frame-dark, #353535)" />
             <stop offset="100%" stop-color="var(--frame-darker, #242424)" />
           </radialGradient>

           <!-- 2. End Cap Body Gradients (Linear) - Side shading -->
           <linearGradient id="cassetteSolidGradientLeft" x1="100%" y1="0%" x2="0%" y2="0%">
             <stop offset="0%" stop-color="var(--frame-color, #454545)" />
             <stop offset="100%" stop-color="var(--frame-darker, #2f2f2f)" />
           </linearGradient>

           <linearGradient id="cassetteSolidGradientRight" x1="0%" y1="0%" x2="100%" y2="0%">
             <stop offset="0%" stop-color="var(--frame-color, #454545)" />
             <stop offset="100%" stop-color="var(--frame-darker, #2f2f2f)" />
           </linearGradient>

           <!-- 3. Middle Body Gradient (Vertical Linear) - Roundness -->
           <linearGradient id="cassetteMiddleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="var(--frame-dark, #353535)" />
              <stop offset="30%" stop-color="var(--frame-color, #454545)" /> 
              <stop offset="100%" stop-color="var(--frame-dark, #353535)" />
           </linearGradient>

           <!-- 4. Rail Gradients -->
           <linearGradient id="railLeftGradient" x1="100%" y1="0%" x2="0%" y2="0%">
             <stop offset="0%" stop-color="var(--frame-color, #454545)" />
             <stop offset="100%" stop-color="var(--frame-darker, #242424)" />
           </linearGradient>

           <linearGradient id="railRightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
             <stop offset="0%" stop-color="var(--frame-color, #454545)" />
             <stop offset="100%" stop-color="var(--frame-darker, #242424)" />
           </linearGradient>

           <linearGradient id="bottomPlateGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="var(--frame-color, #454545)" />
              <stop offset="100%" stop-color="var(--frame-dark, #353535)" />
           </linearGradient>
        </defs>

        <g transform="translate(${padding}, ${padding})">
          
          <!-- ================= C A S S E T T E ================= -->
          <g class="cassette-group">
             
             <!-- 1. Left End Cap Group -->
             <g class="cassette-end-left">
                <!-- Top-Left Rounded Corner (10x10) -->
                <path d="M 0 10 A 10 10 0 0 1 10 0 L 10 10 L 0 10 Z" fill="url(#cornerGradientLeft)" />
                <!-- Vertical strip below corner -->
                <rect x="0" y="10" width="${W_ENDCAP}" height="${
        H_CASSETTE - 10
      }" fill="url(#cassetteSolidGradientLeft)" />
             </g>

             <!-- 2. Right End Cap Group -->
             <g class="cassette-end-right" transform="translate(${svgWidth - W_ENDCAP}, 0)">
                <!-- Top-Right Rounded Corner -->
                <path d="M 0 0 L 10 10 L 0 10 L 0 0 A 10 10 0 0 1 10 10 Z" fill="none" /> <!-- Helper -->
                <path d="M 0 0 L 10 0 A 10 10 0 0 1 10 10 L 0 10 Z" fill="url(#cornerGradientRight)" />
                <!-- Vertical strip below corner -->
                <rect x="0" y="10" width="${W_ENDCAP}" height="${
        H_CASSETTE - 10
      }" fill="url(#cassetteSolidGradientRight)" />
             </g>

             <!-- 3. Middle Section -->
             <rect 
                x="${W_ENDCAP}" 
                y="0" 
                width="${middleWidth}" 
                height="${H_CASSETTE}" 
                fill="url(#cassetteMiddleGradient)" 
             />

             <!-- Optional: Top Edge Highlight Bar (Figma style) -->
             <rect x="0" y="0" width="${svgWidth}" height="1" fill="rgba(255,255,255,0.1)" />
          </g>

          <!-- ================= R A I L S  &  F A B R I C ================= -->
          <g transform="translate(0, ${H_CASSETTE})">
             
             <!-- Left Rail -->
             <rect x="0" y="0" width="${W_RAIL}" height="${railHeight}" fill="url(#railLeftGradient)" />

             <!-- Right Rail -->
             <rect x="${
               svgWidth - W_RAIL
             }" y="0" width="${W_RAIL}" height="${railHeight}" fill="url(#railRightGradient)" />

             <!-- Fabric -->
             <rect 
               x="${W_RAIL}" 
               y="0" 
               width="${fabricWidth}" 
               height="${fabricHeight}" 
               fill="var(--fabric-color, #707070)"
               class="fabric-rect"
             />

             <!-- Bottom Plate -->
             <rect 
               x="${W_RAIL}" 
               y="${fabricHeight}" 
               width="${fabricWidth}" 
               height="${H_BOTTOM}" 
               fill="url(#bottomPlateGradient)" 
             />
          </g>

        </g>
      `;
    }
  }

  window.SVGScreenConfigurator = new SVGScreenConfigurator();
})();
