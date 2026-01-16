/**
 * SVG Screen Configurator
 * Dynamic SVG screen preview matching exact Figma structure.
 *
 * Structure (from Figma node 151:891):
 * - Cassette: #454545, 64px height, 10px top-left/top-right radius
 * - Left Rail: #454545, 26px width, full height
 * - Right Rail: #454545, 26px width, full height
 * - Fabric: #707070 (dynamic color)
 * - Bottom Plate: #454545, 16px height
 *
 * Scale: 1mm = 0.3 visual units
 */

(function () {
  'use strict';

  class SVGScreenConfigurator {
    constructor() {
      this.container = null;
      this.svg = null;
      this.initialized = false;

      // Fixed dimensions from Figma (in visual units, not mm)
      this.CASSETTE_HEIGHT = 64;
      this.CORNER_RADIUS = 10;
      this.RAIL_WIDTH = 26;
      this.BOTTOM_PLATE_HEIGHT = 16;

      // Scale: mm to visual units
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
      this.syncWithConfigurator();

      const current = this.getCurrentState();
      if (!current.width) {
        this.updateFromState(this.getDefaultState());
      }

      console.log('SVG Screen Configurator: Initialized (Clean Figma Structure)');
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

      document.addEventListener('change', (event) => {
        const field = event.target.dataset?.field;
        if (['width', 'height', 'frameColor', 'fabricColor', 'fabricType'].includes(field)) {
          const state = this.getCurrentState();
          state[field] =
            field === 'width' || field === 'height' ? parseInt(event.target.value) || 0 : event.target.value;
          this.updateFromState(state);
        }
      });
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
      if (configurator?.state?.screens?.length > 0) {
        const s = configurator.state.screens[0];
        this.updateFromState({
          width: s.width || 1500,
          height: s.height || 1000,
          frameColor: s.frameColor || 'anthracite',
          fabricColor: s.fabricColor || 'charcoal',
          fabricType: s.fabricType || '4-percent',
        });
      }
    }

    updateFromState(state) {
      if (!this.initialized) return;

      const { width, height, frameColor, fabricColor, fabricType } = state;

      // Update data attributes
      this.container.dataset.width = width;
      this.container.dataset.height = height;
      this.container.dataset.frameColor = frameColor;
      this.container.dataset.fabricColor = fabricColor;
      this.container.dataset.fabricType = fabricType;

      // Get actual hex colors
      const frameHex = this.getFrameHex(frameColor);
      const fabricHex = this.getFabricHex(fabricColor);

      // Update CSS custom properties
      this.container.style.setProperty('--frame-color', frameHex);
      this.container.style.setProperty('--fabric-color', fabricHex);

      // Render SVG and labels
      this.renderSVG(width, height, frameHex, fabricHex, fabricType);
      this.updateDimensionLabels(width, height);
    }

    getFrameHex(frameColor) {
      const data = window.ScreenluxData;
      if (data?.frameColors) {
        const fc = data.frameColors.find((f) => f.id === frameColor);
        if (fc?.hex) return fc.hex;
      }
      // Fallback
      return frameColor === 'white' ? '#F5F5F5' : '#454545';
    }

    getFabricHex(fabricColor) {
      const data = window.ScreenluxData;
      if (data?.fabricColors) {
        const fc = data.fabricColors.find((f) => f.id === fabricColor);
        if (fc?.hex) return fc.hex;
      }
      return '#707070';
    }

    updateDimensionLabels(width, height) {
      const wl = this.container.querySelector('[data-dimension="width"]');
      const hl = this.container.querySelector('[data-dimension="height"]');
      if (wl) wl.textContent = width;
      if (hl) hl.textContent = height;
    }

    renderSVG(widthMM, heightMM, frameHex, fabricHex, fabricType) {
      // Convert mm to visual units
      const W = Math.max(widthMM * this.PX_PER_MM, 200);
      const H = Math.max(heightMM * this.PX_PER_MM, 150);

      // Fixed dimensions
      const CASSETTE_H = this.CASSETTE_HEIGHT;
      const CORNER_R = this.CORNER_RADIUS;
      const RAIL_W = this.RAIL_WIDTH;
      const BOTTOM_H = this.BOTTOM_PLATE_HEIGHT;

      // Calculate derived dimensions
      const railsAndFabricH = H - CASSETTE_H;
      const fabricW = W - RAIL_W * 2;
      const fabricH = railsAndFabricH - BOTTOM_H;

      // Fabric opacity based on type
      const fabricOpacity = fabricType === 'blackout' ? 1 : 0.92;

      // Padding around SVG
      const PAD = 20;
      const viewW = W + PAD * 2;
      const viewH = H + PAD * 2;

      this.svg.setAttribute('viewBox', `0 0 ${viewW} ${viewH}`);

      // Build SVG content - SIMPLE RECTANGLES matching Figma exactly
      this.svg.innerHTML = `
        <g transform="translate(${PAD}, ${PAD})">
          
          <!-- CASSETTE: Rounded top corners only -->
          <rect 
            x="0" 
            y="0" 
            width="${W}" 
            height="${CASSETTE_H}" 
            rx="${CORNER_R}" 
            ry="${CORNER_R}" 
            fill="${frameHex}"
          />
          <!-- Square off bottom corners of cassette -->
          <rect 
            x="0" 
            y="${CASSETTE_H - CORNER_R}" 
            width="${W}" 
            height="${CORNER_R}" 
            fill="${frameHex}"
          />

          <!-- RAILS AND FABRIC AREA -->
          <g transform="translate(0, ${CASSETTE_H})">
            
            <!-- LEFT RAIL -->
            <rect 
              x="0" 
              y="0" 
              width="${RAIL_W}" 
              height="${railsAndFabricH}" 
              fill="${frameHex}"
            />
            
            <!-- RIGHT RAIL -->
            <rect 
              x="${W - RAIL_W}" 
              y="0" 
              width="${RAIL_W}" 
              height="${railsAndFabricH}" 
              fill="${frameHex}"
            />
            
            <!-- FABRIC -->
            <rect 
              x="${RAIL_W}" 
              y="0" 
              width="${fabricW}" 
              height="${fabricH}" 
              fill="${fabricHex}"
              opacity="${fabricOpacity}"
              class="fabric-rect"
            />
            
            <!-- BOTTOM PLATE -->
            <rect 
              x="${RAIL_W}" 
              y="${fabricH}" 
              width="${fabricW}" 
              height="${BOTTOM_H}" 
              fill="${frameHex}"
            />
            
          </g>
        </g>
      `;
    }
  }

  window.SVGScreenConfigurator = new SVGScreenConfigurator();
})();
