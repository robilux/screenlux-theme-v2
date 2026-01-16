/**
 * SVG Screen Configurator
 * Handles dynamic updates to the SVG screen preview based on configurator state.
 *
 * Features:
 * - Updates SVG viewBox proportionally based on width/height
 * - Changes colors based on frame and fabric color selections
 * - Syncs with product-configurator-v2.js via custom events
 * - Smooth CSS transitions for all changes
 * - Draws Cassette as a UNIFIED shape with overlays for End Caps (fixes "broken" seams)
 */

(function () {
  'use strict';

  class SVGScreenConfigurator {
    constructor() {
      this.container = null;
      this.svg = null;
      this.initialized = false;

      // FIXED DIMENSIONS (Pixels)
      this.CASSETTE_HEIGHT = 64;
      this.CORNER_RADIUS = 10;
      this.RAIL_WIDTH = 26;
      this.BOTTOM_PLATE_HEIGHT = 16;
      this.END_CAP_WIDTH = 10;

      // Conversion: 1mm = 0.3px
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

      console.log('SVG Screen Configurator: Initialized with Unified Cassette');
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

      if (data && data.frameColors) {
        const frame = data.frameColors.find((f) => f.id === frameColor);
        if (frame && frame.hex) {
          this.container.style.setProperty('--frame-color', frame.hex);
          this.container.style.setProperty('--frame-dark', this.shiftColor(frame.hex, -20));
          this.container.style.setProperty('--frame-darker', this.shiftColor(frame.hex, -40));
          this.container.style.setProperty('--frame-light', this.shiftColor(frame.hex, 20));
        }
      }

      if (data && data.fabricColors) {
        const fabric = data.fabricColors.find((f) => f.id === fabricColor);
        if (fabric && fabric.hex) {
          this.container.style.setProperty('--fabric-color', fabric.hex);
        }
      }

      const fabricElement = this.svg.querySelector('.fabric-rect');
      if (fabricElement) {
        fabricElement.style.opacity = fabricType === 'blackout' ? '1' : '0.92';
      }
    }

    shiftColor(hex, percent) {
      hex = hex.replace('#', '');
      let r = parseInt(hex.substring(0, 2), 16);
      let g = parseInt(hex.substring(2, 4), 16);
      let b = parseInt(hex.substring(4, 6), 16);

      if (percent > 0) {
        r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
        g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
        b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));
      } else {
        const p = Math.abs(percent);
        r = Math.max(0, Math.floor((r * (100 - p)) / 100));
        g = Math.max(0, Math.floor((g * (100 - p)) / 100));
        b = Math.max(0, Math.floor((b * (100 - p)) / 100));
      }
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    renderSVG(widthMM, heightMM) {
      const svgWidth = Math.max(widthMM * this.PX_PER_MM, 240);
      const svgHeight = Math.max(heightMM * this.PX_PER_MM, 200);

      const H_CASSETTE = this.CASSETTE_HEIGHT;
      const W_RAIL = this.RAIL_WIDTH;
      const H_BOTTOM = this.BOTTOM_PLATE_HEIGHT;
      const R_CORNER = this.CORNER_RADIUS;
      const W_ENDCAP = this.END_CAP_WIDTH;

      const fabricWidth = svgWidth - W_RAIL * 2;
      const railHeight = svgHeight - H_CASSETTE;
      const fabricHeight = railHeight - H_BOTTOM;

      const padding = 20;
      this.svg.setAttribute('viewBox', `0 0 ${svgWidth + padding * 2} ${svgHeight + padding * 2}`);

      // Path for Cassette: Rounded Top Corners only
      const pathCassette = `
        M 0 ${H_CASSETTE} 
        L 0 ${R_CORNER} 
        A ${R_CORNER} ${R_CORNER} 0 0 1 ${R_CORNER} 0 
        L ${svgWidth - R_CORNER} 0 
        A ${R_CORNER} ${R_CORNER} 0 0 1 ${svgWidth} ${R_CORNER} 
        L ${svgWidth} ${H_CASSETTE} 
        Z
      `;

      // Paths for End Caps (Masks/Overlays)
      const pathLeftCap = `
        M 0 ${H_CASSETTE} 
        L 0 ${R_CORNER} 
        A ${R_CORNER} ${R_CORNER} 0 0 1 ${R_CORNER} 0 
        L ${W_ENDCAP} 0 
        L ${W_ENDCAP} ${H_CASSETTE} 
        Z
      `;

      const pathRightCap = `
        M ${svgWidth - W_ENDCAP} 0 
        L ${svgWidth - R_CORNER} 0 
        A ${R_CORNER} ${R_CORNER} 0 0 1 ${svgWidth} ${R_CORNER} 
        L ${svgWidth} ${H_CASSETTE} 
        L ${svgWidth - W_ENDCAP} ${H_CASSETTE} 
        Z
      `;

      this.svg.innerHTML = `
        <defs>
           <!-- 1. Main Metallic Gradient (Vertical) -->
           <linearGradient id="metalVerticalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="var(--frame-dark, #353535)" />
              <stop offset="30%" stop-color="var(--frame-color, #454545)" /> 
              <stop offset="60%" stop-color="var(--frame-dark, #353535)" />
              <stop offset="100%" stop-color="var(--frame-darker, #242424)" />
           </linearGradient>

           <!-- 2. End Cap Overlays (Shading) -->
           <!-- Left: Darker at left edge (0%), Transparent at inner edge (100%) -->
           <linearGradient id="capOverlayLeft" x1="0%" y1="0%" x2="100%" y2="0%">
             <stop offset="0%" stop-color="var(--frame-darker, #000)" stop-opacity="0.5" />
             <stop offset="100%" stop-color="var(--frame-color, #454545)" stop-opacity="0" />
           </linearGradient>
           
           <!-- Right: Darker at right edge (100%), Transparent at inner edge (0%) -->
           <linearGradient id="capOverlayRight" x1="0%" y1="0%" x2="100%" y2="0%">
             <stop offset="0%" stop-color="var(--frame-color, #454545)" stop-opacity="0" />
             <stop offset="100%" stop-color="var(--frame-darker, #000)" stop-opacity="0.5" />
           </linearGradient>

           <!-- 3. Rail Gradients (Horizontal) -->
           <linearGradient id="railLeftGradient" x1="100%" y1="0%" x2="0%" y2="0%">
             <stop offset="0%" stop-color="var(--frame-color, #454545)" />
             <stop offset="15%" stop-color="#555" /> <!-- Highlight strip -->
             <stop offset="100%" stop-color="var(--frame-darker, #242424)" />
           </linearGradient>

           <linearGradient id="railRightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
             <stop offset="0%" stop-color="var(--frame-color, #454545)" />
             <stop offset="15%" stop-color="#555" /> 
             <stop offset="100%" stop-color="var(--frame-darker, #242424)" />
           </linearGradient>
           
           <!-- 4. Bottom Plate -->
           <linearGradient id="bottomPlateGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="var(--frame-color, #454545)" />
              <stop offset="100%" stop-color="var(--frame-dark, #353535)" />
           </linearGradient>
           
           <!-- 5. Dropshadow for depth -->
           <filter id="shadowDepth" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
           </filter>

        </defs>

        <g transform="translate(${padding}, ${padding})">
          
          <!-- ================= C A S S E T T E ================= -->
          <!-- Unified Main Body -->
          <g class="cassette-group" filter="url(#shadowDepth)">
            <path d="${pathCassette}" fill="url(#metalVerticalGradient)" />
            
            <!-- Left End Cap Overlay -->
            <path d="${pathLeftCap}" fill="url(#capOverlayLeft)" />
            
            <!-- Right End Cap Overlay -->
            <path d="${pathRightCap}" fill="url(#capOverlayRight)" />
            
            <!-- Top Highlight Line (Reflection) -->
            <path d="M ${R_CORNER} 1 L ${svgWidth - R_CORNER} 1" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
          </g>

          <!-- ================= R A I L S  &  F A B R I C ================= -->
          <!-- Moved down slightly less to overlap/tuck under shadow -->
          <g transform="translate(0, ${H_CASSETTE - 1})">
             
             <!-- Left Rail -->
             <rect x="0" y="0" width="${W_RAIL}" height="${railHeight + 1}" fill="url(#railLeftGradient)" />

             <!-- Right Rail -->
             <rect x="${svgWidth - W_RAIL}" y="0" width="${W_RAIL}" height="${
        railHeight + 1
      }" fill="url(#railRightGradient)" />

             <!-- Fabric -->
             <rect 
               x="${W_RAIL}" 
               y="0" 
               width="${fabricWidth}" 
               height="${fabricHeight + 1}" 
               fill="var(--fabric-color, #707070)"
               class="fabric-rect"
             />

             <!-- Bottom Plate -->
             <rect 
               x="${W_RAIL + 4}" 
               y="${fabricHeight}" 
               width="${fabricWidth - 8}" 
               height="${H_BOTTOM}" 
               rx="2"
               fill="url(#bottomPlateGradient)" 
             />
          </g>

        </g>
      `;
    }
  }

  window.SVGScreenConfigurator = new SVGScreenConfigurator();
})();
