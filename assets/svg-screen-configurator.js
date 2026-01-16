/**
 * SVG Screen Configurator - Accurate Figma Implementation
 *
 * Structure from Figma (node 151:891):
 *
 * CASSETTE (height ~43px visual, 64px Figma scaled down):
 * - Container background with rounded TOP corners only
 * - Left End: Top-left rounded square + side band (NO bottom circle)
 * - Container: Flexible width main body
 * - Container Fixed: Solar panel section
 * - Right End: Top-right rounded square + side band (NO bottom circle)
 *
 * Fixed dimensions scaled down by ~1.5x for proper proportions.
 */

(function () {
  'use strict';

  class SVGScreenConfigurator {
    constructor() {
      this.container = null;
      this.svg = null;
      this.initialized = false;

      // Fixed dimensions - REDUCED by ~1.5x for proper proportions
      this.FIXED = {
        CASSETTE_HEIGHT: 42, // Was 64
        TOP_BAND: 7, // Was 10
        MIDDLE_BAND: 28, // Was 44
        BOTTOM_BAND: 7, // Was 10
        END_CAP_WIDTH: 7, // Was 10
        SOLAR_PANEL_WIDTH: 300, // Was 450 (proportionally)
        RAIL_WIDTH: 17, // Was 26
        BOTTOM_PLATE_HEIGHT: 10, // Was 16
        CORNER_RADIUS: 7, // Was 10
      };

      // Colors from Figma
      this.COLORS = {
        FRAME_ANTHRACITE: '#454545',
        FRAME_ANTHRACITE_DARK: '#353535',
        FRAME_ANTHRACITE_DARKER: '#242424',
        FRAME_WHITE: '#F5F5F5',
        FRAME_WHITE_DARK: '#E8E8E8',
        FRAME_WHITE_DARKER: '#D5D5D5',
        FABRIC_DEFAULT: '#707070',
        SOLAR_PANEL_ACTIVE: '#373F47',
      };

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

      console.log('SVG Screen Configurator: Initialized (Fixed Proportions)');
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
        motor: 'wired',
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
        if (['width', 'height', 'frameColor', 'fabricColor', 'fabricType', 'motor'].includes(field)) {
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
        motor: this.container.dataset.motor || 'wired',
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
          motor: s.motor || 'wired',
        });
      }
    }

    updateFromState(state) {
      if (!this.initialized) return;

      const { width, height, frameColor, fabricColor, fabricType, motor } = state;

      Object.assign(this.container.dataset, {
        width,
        height,
        frameColor,
        fabricColor,
        fabricType,
        motor,
      });

      const colors = this.getColors(frameColor, fabricColor, motor);
      this.renderSVG(width, height, colors, fabricType);
      this.updateDimensionLabels(width, height);
    }

    getColors(frameColor, fabricColor, motor) {
      const isWhite = frameColor === 'white';
      const isSolar = motor === 'solar';

      const frame = isWhite ? this.COLORS.FRAME_WHITE : this.COLORS.FRAME_ANTHRACITE;
      const frameDark = isWhite ? this.COLORS.FRAME_WHITE_DARK : this.COLORS.FRAME_ANTHRACITE_DARK;
      const frameDarker = isWhite ? this.COLORS.FRAME_WHITE_DARKER : this.COLORS.FRAME_ANTHRACITE_DARKER;

      const solarPanel = isSolar ? this.COLORS.SOLAR_PANEL_ACTIVE : frame;

      let fabric = this.COLORS.FABRIC_DEFAULT;
      const data = window.ScreenluxData;
      if (data?.fabricColors) {
        const fc = data.fabricColors.find((f) => f.id === fabricColor);
        if (fc?.hex) fabric = fc.hex;
      }

      return { frame, frameDark, frameDarker, solarPanel, fabric };
    }

    updateDimensionLabels(width, height) {
      const wl = this.container.querySelector('[data-dimension="width"]');
      const hl = this.container.querySelector('[data-dimension="height"]');
      if (wl) wl.textContent = width;
      if (hl) hl.textContent = height;
    }

    renderSVG(widthMM, heightMM, colors, fabricType) {
      const F = this.FIXED;

      // Convert mm to visual units
      const totalW = Math.max(widthMM * this.PX_PER_MM, 200);
      const totalH = Math.max(heightMM * this.PX_PER_MM, 150);

      // Calculate cassette sections
      const solarPanelW = Math.min(F.SOLAR_PANEL_WIDTH * (totalW / 1000), totalW * 0.3);
      const containerW = totalW - F.END_CAP_WIDTH * 2 - solarPanelW;

      // Rails and fabric dimensions
      const railsH = totalH - F.CASSETTE_HEIGHT;
      const fabricW = totalW - F.RAIL_WIDTH * 2;
      const fabricH = railsH - F.BOTTOM_PLATE_HEIGHT;

      const fabricOpacity = fabricType === 'blackout' ? 1 : 0.92;

      const PAD = 15;
      const viewW = totalW + PAD * 2;
      const viewH = totalH + PAD * 2;

      this.svg.setAttribute('viewBox', `0 0 ${viewW} ${viewH}`);

      this.svg.innerHTML = `
        <defs>
          <!-- Top corner gradients (radial) -->
          <radialGradient id="cornerTL" cx="100%" cy="100%" r="100%">
            <stop offset="50%" stop-color="${colors.frame}" />
            <stop offset="75%" stop-color="${colors.frameDark}" />
            <stop offset="100%" stop-color="${colors.frameDarker}" />
          </radialGradient>
          <radialGradient id="cornerTR" cx="0%" cy="100%" r="100%">
            <stop offset="50%" stop-color="${colors.frame}" />
            <stop offset="75%" stop-color="${colors.frameDark}" />
            <stop offset="100%" stop-color="${colors.frameDarker}" />
          </radialGradient>
          
          <!-- Band gradients -->
          <linearGradient id="topBand" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${colors.frameDarker}" />
            <stop offset="100%" stop-color="${colors.frameDark}" />
          </linearGradient>
          <linearGradient id="bottomBand" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${colors.frameDark}" />
            <stop offset="100%" stop-color="${colors.frameDarker}" />
          </linearGradient>
          
          <!-- End cap side gradients -->
          <linearGradient id="leftSide" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="50%" stop-color="${colors.frame}" />
            <stop offset="100%" stop-color="${colors.frameDarker}" />
          </linearGradient>
          <linearGradient id="rightSide" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="50%" stop-color="${colors.frame}" />
            <stop offset="100%" stop-color="${colors.frameDarker}" />
          </linearGradient>
        </defs>

        <g transform="translate(${PAD}, ${PAD})">
          
          <!-- ═══════════════ CASSETTE ═══════════════ -->
          <!-- Container background with rounded TOP corners -->
          <rect 
            x="0" 
            y="0" 
            width="${totalW}" 
            height="${F.CASSETTE_HEIGHT}" 
            rx="${F.CORNER_RADIUS}" 
            ry="${F.CORNER_RADIUS}" 
            fill="${colors.frame}"
          />
          <!-- Square off bottom corners of container -->
          <rect 
            x="0" 
            y="${F.CASSETTE_HEIGHT - F.CORNER_RADIUS}" 
            width="${totalW}" 
            height="${F.CORNER_RADIUS}" 
            fill="${colors.frame}"
          />
          
          <g class="cassette">
            
            <!-- LEFT END (square with top-left radius only, NO bottom circle) -->
            <g class="left-end">
              <!-- Top-left corner square with border-radius on top-left -->
              <rect x="0" y="0" width="${F.END_CAP_WIDTH}" height="${F.TOP_BAND}" rx="${F.CORNER_RADIUS}" ry="${
        F.CORNER_RADIUS
      }" fill="url(#cornerTL)" />
              <!-- Square off right and bottom corners -->
              <rect x="${F.END_CAP_WIDTH - F.CORNER_RADIUS}" y="0" width="${F.CORNER_RADIUS}" height="${
        F.TOP_BAND
      }" fill="url(#cornerTL)" />
              <rect x="0" y="${F.TOP_BAND - F.CORNER_RADIUS}" width="${F.END_CAP_WIDTH}" height="${
        F.CORNER_RADIUS
      }" fill="url(#cornerTL)" />
              
              <!-- Side band (middle section) -->
              <rect x="0" y="${F.TOP_BAND}" width="${F.END_CAP_WIDTH}" height="${
        F.MIDDLE_BAND + F.BOTTOM_BAND
      }" fill="url(#leftSide)" />
            </g>
            
            <!-- CONTAINER (flexible width) -->
            <g class="container" transform="translate(${F.END_CAP_WIDTH}, 0)">
              <rect x="0" y="0" width="${containerW}" height="${F.TOP_BAND}" fill="url(#topBand)" />
              <rect x="0" y="${F.TOP_BAND}" width="${containerW}" height="${F.MIDDLE_BAND}" fill="${colors.frame}" />
              <rect x="0" y="${F.TOP_BAND + F.MIDDLE_BAND}" width="${containerW}" height="${
        F.BOTTOM_BAND
      }" fill="url(#bottomBand)" />
            </g>
            
            <!-- CONTAINER FIXED / SOLAR PANEL -->
            <g class="container-fixed" transform="translate(${F.END_CAP_WIDTH + containerW}, 0)">
              <rect x="0" y="0" width="${solarPanelW}" height="${F.TOP_BAND}" fill="url(#topBand)" />
              <rect x="0" y="${F.TOP_BAND}" width="${solarPanelW}" height="${F.MIDDLE_BAND}" fill="${
        colors.solarPanel
      }" class="solar-panel" />
              <rect x="0" y="${F.TOP_BAND + F.MIDDLE_BAND}" width="${solarPanelW}" height="${
        F.BOTTOM_BAND
      }" fill="url(#bottomBand)" />
            </g>
            
            <!-- RIGHT END (square with top-right radius only, NO bottom circle) -->
            <g class="right-end" transform="translate(${totalW - F.END_CAP_WIDTH}, 0)">
              <!-- Top-right corner square with border-radius on top-right -->
              <rect x="0" y="0" width="${F.END_CAP_WIDTH}" height="${F.TOP_BAND}" rx="${F.CORNER_RADIUS}" ry="${
        F.CORNER_RADIUS
      }" fill="url(#cornerTR)" />
              <!-- Square off left and bottom corners -->
              <rect x="0" y="0" width="${F.CORNER_RADIUS}" height="${F.TOP_BAND}" fill="url(#cornerTR)" />
              <rect x="0" y="${F.TOP_BAND - F.CORNER_RADIUS}" width="${F.END_CAP_WIDTH}" height="${
        F.CORNER_RADIUS
      }" fill="url(#cornerTR)" />
              
              <!-- Side band (middle section) -->
              <rect x="0" y="${F.TOP_BAND}" width="${F.END_CAP_WIDTH}" height="${
        F.MIDDLE_BAND + F.BOTTOM_BAND
      }" fill="url(#rightSide)" />
            </g>
            
          </g>
          
          <!-- ═══════════════ RAILS & FABRIC ═══════════════ -->
          <g class="rails-fabric" transform="translate(0, ${F.CASSETTE_HEIGHT})">
            
            <rect x="0" y="0" width="${F.RAIL_WIDTH}" height="${railsH}" fill="${colors.frame}" />
            
            <rect 
              x="${F.RAIL_WIDTH}" 
              y="0" 
              width="${fabricW}" 
              height="${fabricH}" 
              fill="${colors.fabric}"
              opacity="${fabricOpacity}"
              class="fabric-rect"
            />
            
            <rect 
              x="${F.RAIL_WIDTH}" 
              y="${fabricH}" 
              width="${fabricW}" 
              height="${F.BOTTOM_PLATE_HEIGHT}" 
              fill="${colors.frame}"
            />
            
            <rect x="${totalW - F.RAIL_WIDTH}" y="0" width="${F.RAIL_WIDTH}" height="${railsH}" fill="${
        colors.frame
      }" />
            
          </g>
          
        </g>
      `;
    }
  }

  window.SVGScreenConfigurator = new SVGScreenConfigurator();
})();
