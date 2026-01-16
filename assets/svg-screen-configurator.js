/**
 * SVG Screen Configurator
 * Handles dynamic updates to the SVG screen preview based on configurator state.
 *
 * Features:
 * - Updates SVG viewBox proportionally based on width/height
 * - Changes colors based on frame and fabric color selections
 * - Syncs with product-configurator-v2.js via custom events
 * - Smooth CSS transitions for all changes
 */

(function () {
  'use strict';

  class SVGScreenConfigurator {
    constructor() {
      this.container = null;
      this.svg = null;
      this.initialized = false;

      // Fixed dimensions from Figma (in visual units for SVG)
      this.CASSETTE_HEIGHT = 64;
      this.RAIL_WIDTH = 26;
      this.BOTTOM_PLATE_HEIGHT = 16;
      this.CORNER_RADIUS = 10;
      this.TOP_BAR_HEIGHT = 8;

      // Scale factor: mm to SVG units (we'll scale down for reasonable viewBox)
      // A 1500mm screen becomes 300 SVG units (divide by 5)
      this.SCALE_FACTOR = 5;

      // Minimum visual dimensions to prevent too-small SVG
      this.MIN_SVG_WIDTH = 200;
      this.MIN_SVG_HEIGHT = 150;

      this.init();
    }

    init() {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setup());
      } else {
        this.setup();
      }
    }

    setup() {
      this.container = document.getElementById('svg-screen-configurator');
      if (!this.container) {
        console.log('SVG Screen Configurator: Container not found, will retry on mutation');
        this.observeForContainer();
        return;
      }

      this.svg = this.container.querySelector('.configurator-svg');
      if (!this.svg) {
        console.error('SVG Screen Configurator: SVG element not found');
        return;
      }

      this.initialized = true;
      this.bindEvents();

      // Initial render with default values
      this.updateFromState(this.getDefaultState());

      console.log('SVG Screen Configurator: Initialized');
    }

    observeForContainer() {
      const observer = new MutationObserver((mutations, obs) => {
        const container = document.getElementById('svg-screen-configurator');
        if (container) {
          obs.disconnect();
          this.setup();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
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
      // Listen for configurator state changes
      document.addEventListener('screenlux:screen-updated', (event) => {
        if (event.detail) {
          this.updateFromState(event.detail);
        }
      });

      // Also listen for dimension input changes directly (backup method)
      document.addEventListener('change', (event) => {
        if (event.target.matches('[data-field="width"], [data-field="height"]')) {
          this.handleDimensionChange(event);
        }
        if (event.target.matches('[data-field="frameColor"], [data-field="fabricColor"], [data-field="fabricType"]')) {
          this.handleColorChange(event);
        }
      });

      // Listen for the configurator to fully initialize
      document.addEventListener('screenlux:configurator-ready', () => {
        this.syncWithConfigurator();
      });
    }

    handleDimensionChange(event) {
      const field = event.target.dataset.field;
      const value = parseInt(event.target.value) || 0;

      const currentState = this.getCurrentState();
      currentState[field] = value;

      this.updateFromState(currentState);
    }

    handleColorChange(event) {
      const field = event.target.dataset.field;
      const value = event.target.value;

      const currentState = this.getCurrentState();
      currentState[field] = value;

      this.updateFromState(currentState);
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
      // Try to get state from the configurator
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
      if (!this.initialized || !this.container || !this.svg) return;

      const { width, height, frameColor, fabricColor, fabricType } = state;

      // Update data attributes
      this.container.dataset.width = width;
      this.container.dataset.height = height;
      this.container.dataset.frameColor = frameColor;
      this.container.dataset.fabricColor = fabricColor;
      this.container.dataset.fabricType = fabricType;

      // Update SVG viewBox
      this.updateViewBox(width, height);

      // Update dimension labels
      this.updateDimensionLabels(width, height);

      // Update colors via CSS custom properties
      this.updateColors(frameColor, fabricColor, fabricType);

      // Re-render SVG elements with new dimensions
      this.renderSVG(width, height);
    }

    updateViewBox(widthMM, heightMM) {
      // Convert mm to SVG units
      let svgWidth = Math.max(widthMM / this.SCALE_FACTOR, this.MIN_SVG_WIDTH);
      let svgHeight = Math.max(heightMM / this.SCALE_FACTOR, this.MIN_SVG_HEIGHT);

      // Add padding for visual breathing room
      const padding = 20;
      const totalWidth = svgWidth + padding * 2;
      const totalHeight = svgHeight + padding * 2;

      this.svg.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);
    }

    updateDimensionLabels(width, height) {
      const widthLabel = this.container.querySelector('[data-dimension="width"]');
      const heightLabel = this.container.querySelector('[data-dimension="height"]');

      if (widthLabel) widthLabel.textContent = width;
      if (heightLabel) heightLabel.textContent = height;
    }

    updateColors(frameColor, fabricColor, fabricType) {
      // Get color values from ScreenluxData if available
      const data = window.ScreenluxData;

      // Frame color
      if (data && data.frameColors) {
        const frame = data.frameColors.find((f) => f.id === frameColor);
        if (frame && frame.hex) {
          this.container.style.setProperty('--frame-color', frame.hex);
          // Generate darker shades
          this.container.style.setProperty('--frame-dark', this.darkenColor(frame.hex, 20));
          this.container.style.setProperty('--frame-darker', this.darkenColor(frame.hex, 40));
        }
      }

      // Fabric color
      if (data && data.fabricColors) {
        const fabric = data.fabricColors.find((f) => f.id === fabricColor);
        if (fabric && fabric.hex) {
          this.container.style.setProperty('--fabric-color', fabric.hex);
        }
      }

      // Fabric type affects opacity
      const fabricElement = this.svg.querySelector('.fabric');
      if (fabricElement) {
        if (fabricType === 'blackout') {
          fabricElement.style.opacity = '1';
        } else {
          // 4% openness - slightly transparent
          fabricElement.style.opacity = '0.92';
        }
      }
    }

    darkenColor(hex, percent) {
      // Remove # if present
      hex = hex.replace('#', '');

      // Convert to RGB
      let r = parseInt(hex.substr(0, 2), 16);
      let g = parseInt(hex.substr(2, 2), 16);
      let b = parseInt(hex.substr(4, 2), 16);

      // Darken
      r = Math.max(0, Math.floor((r * (100 - percent)) / 100));
      g = Math.max(0, Math.floor((g * (100 - percent)) / 100));
      b = Math.max(0, Math.floor((b * (100 - percent)) / 100));

      // Convert back to hex
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    renderSVG(widthMM, heightMM) {
      // Convert dimensions to SVG units
      const svgWidth = Math.max(widthMM / this.SCALE_FACTOR, this.MIN_SVG_WIDTH);
      const svgHeight = Math.max(heightMM / this.SCALE_FACTOR, this.MIN_SVG_HEIGHT);

      const padding = 20;

      // Scale fixed dimensions proportionally
      // The ratio determines how much of the total height is cassette vs fabric
      const cassetteHeightScaled = this.CASSETTE_HEIGHT / this.SCALE_FACTOR;
      const railWidthScaled = this.RAIL_WIDTH / this.SCALE_FACTOR;
      const bottomPlateScaled = this.BOTTOM_PLATE_HEIGHT / this.SCALE_FACTOR;
      const topBarScaled = this.TOP_BAR_HEIGHT / this.SCALE_FACTOR;
      const cornerRadiusScaled = this.CORNER_RADIUS / this.SCALE_FACTOR;

      // Build the SVG content
      const fabricWidth = svgWidth - railWidthScaled * 2;
      const fabricHeight = svgHeight - cassetteHeightScaled - bottomPlateScaled;
      const railHeight = svgHeight - cassetteHeightScaled;

      this.svg.innerHTML = `
        <defs>
          <!-- Gradients for realistic shading -->
          <linearGradient id="cassetteGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="var(--frame-dark, #353535)" />
            <stop offset="30%" stop-color="var(--frame-color, #454545)" />
            <stop offset="100%" stop-color="var(--frame-dark, #353535)" />
          </linearGradient>
          
          <linearGradient id="leftRailGradient" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="var(--frame-color, #454545)" />
            <stop offset="100%" stop-color="var(--frame-darker, #2f2f2f)" />
          </linearGradient>
          
          <linearGradient id="rightRailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="var(--frame-color, #454545)" />
            <stop offset="100%" stop-color="var(--frame-darker, #2f2f2f)" />
          </linearGradient>
          
          <linearGradient id="bottomPlateGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="var(--frame-color, #454545)" />
            <stop offset="100%" stop-color="var(--frame-dark, #353535)" />
          </linearGradient>
        </defs>
        
        <g transform="translate(${padding}, ${padding})">
          <!-- Cassette (Top Bar) - Fixed Height, Flexible Width -->
          <g class="cassette-group">
            <!-- Main cassette body with rounded top corners -->
            <rect 
              x="0" 
              y="0" 
              width="${svgWidth}" 
              height="${cassetteHeightScaled}"
              rx="${cornerRadiusScaled}"
              ry="${cornerRadiusScaled}"
              fill="url(#cassetteGradient)"
              class="cassette-main"
            />
            <!-- Cut off bottom corners (make them square) -->
            <rect 
              x="0" 
              y="${cassetteHeightScaled - cornerRadiusScaled}" 
              width="${svgWidth}" 
              height="${cornerRadiusScaled}"
              fill="var(--frame-color, #454545)"
              class="cassette-bottom-fill"
            />
          </g>
          
          <!-- Rails and Fabric Container -->
          <g class="rails-fabric-group" transform="translate(0, ${cassetteHeightScaled})">
            <!-- Left Rail - Fixed Width, Flexible Height -->
            <rect 
              x="0" 
              y="0" 
              width="${railWidthScaled}" 
              height="${railHeight}"
              fill="url(#leftRailGradient)"
              class="rail-left"
            />
            
            <!-- Right Rail - Fixed Width, Flexible Height -->
            <rect 
              x="${svgWidth - railWidthScaled}" 
              y="0" 
              width="${railWidthScaled}" 
              height="${railHeight}"
              fill="url(#rightRailGradient)"
              class="rail-right"
            />
            
            <!-- Fabric Area - Flexible Width & Height -->
            <rect 
              x="${railWidthScaled}" 
              y="0" 
              width="${fabricWidth}" 
              height="${fabricHeight}"
              fill="var(--fabric-color, #707070)"
              class="fabric"
            />
            
            <!-- Bottom Plate - Fixed Height, Flexible Width -->
            <rect 
              x="${railWidthScaled}" 
              y="${fabricHeight}" 
              width="${fabricWidth}" 
              height="${bottomPlateScaled}"
              fill="url(#bottomPlateGradient)"
              class="bottom-plate"
            />
          </g>
        </g>
      `;
    }
  }

  // Initialize when script loads
  window.SVGScreenConfigurator = new SVGScreenConfigurator();

  // Export for potential external use
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SVGScreenConfigurator;
  }
})();
