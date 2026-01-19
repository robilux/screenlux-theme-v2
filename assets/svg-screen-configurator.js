/**
 * SVG Screen Configurator - Accurate Figma Implementation
 *
 * Top/Bottom bands: Same gradient style as side bands but vertical
 * Bottom corners: Mirrored versions of top corners
 */

(function () {
  'use strict';

  class SVGScreenConfigurator {
    constructor() {
      this.container = null;
      this.svg = null;
      this.initialized = false;

      this.FIXED = {
        CASSETTE_HEIGHT: 25,
        TOP_BAND: 4,
        MIDDLE_BAND: 17,
        BOTTOM_BAND: 4,
        END_CAP_WIDTH: 4,
        SOLAR_PANEL_WIDTH: 300,
        RAIL_WIDTH: 12,
        BOTTOM_PLATE_HEIGHT: 6,
        CORNER_RADIUS: 4,
      };

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

    // Path for square with only TOP-LEFT rounded corner
    pathTopLeft(x, y, w, h, r) {
      return `M ${x + r} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} L ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
    }

    // Path for square with only TOP-RIGHT rounded corner
    pathTopRight(x, y, w, h, r) {
      return `M ${x} ${y} L ${x + w - r} ${y} A ${r} ${r} 0 0 1 ${x + w} ${y + r} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
    }

    // Path for square with only BOTTOM-LEFT rounded corner (mirrored top-left)
    pathBottomLeft(x, y, w, h, r) {
      return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x + r} ${y + h} A ${r} ${r} 0 0 1 ${x} ${y + h - r} L ${x} ${y} Z`;
    }

    // Path for square with only BOTTOM-RIGHT rounded corner (mirrored top-right)
    pathBottomRight(x, y, w, h, r) {
      return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} L ${x} ${y + h} Z`;
    }

    renderSVG(widthMM, heightMM, colors, fabricType) {
      const F = this.FIXED;

      const totalW = Math.max(widthMM * this.PX_PER_MM, 200);
      const totalH = Math.max(heightMM * this.PX_PER_MM, 150);

      const solarPanelW = Math.min(F.SOLAR_PANEL_WIDTH * (totalW / 1000), totalW * 0.3);
      const containerW = totalW - F.END_CAP_WIDTH * 2 - solarPanelW;

      const railsH = totalH - F.CASSETTE_HEIGHT;
      const fabricW = totalW - F.RAIL_WIDTH * 2;
      const fabricH = railsH - F.BOTTOM_PLATE_HEIGHT;

      const fabricOpacity = fabricType === 'blackout' ? 1 : 0.92;

      const PAD = 15;
      const viewW = totalW + PAD * 2;
      const viewH = totalH + PAD * 2;

      const W = F.END_CAP_WIDTH;
      const R = F.CORNER_RADIUS;
      const H = F.TOP_BAND;

      this.svg.setAttribute('viewBox', `0 0 ${viewW} ${viewH}`);

      this.svg.innerHTML = `
        <defs>
          <!-- CORNER RADIAL GRADIENTS -->
          
          <!-- Top-left corner -->
          <radialGradient id="gradTL" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${W}" gradientTransform="matrix(-0.7 -0.75 0.75 -0.7 ${W} ${H})">
            <stop offset="0.50" stop-color="${colors.frame}" />
            <stop offset="0.75" stop-color="${colors.frameDark}" />
            <stop offset="1" stop-color="${colors.frameDarker}" />
          </radialGradient>
          
          <!-- Top-right corner -->
          <radialGradient id="gradTR" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${W}" gradientTransform="matrix(0.7 -0.75 0.75 0.7 0 ${H})">
            <stop offset="0.50" stop-color="${colors.frame}" />
            <stop offset="0.75" stop-color="${colors.frameDark}" />
            <stop offset="1" stop-color="${colors.frameDarker}" />
          </radialGradient>
          
          <!-- Bottom-left corner (SAME gradient style as top-left) -->
          <radialGradient id="gradBL" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${W}" gradientTransform="matrix(-0.7 -0.75 0.75 -0.7 ${W} ${F.BOTTOM_BAND})">
            <stop offset="0.50" stop-color="${colors.frame}" />
            <stop offset="0.75" stop-color="${colors.frameDark}" />
            <stop offset="1" stop-color="${colors.frameDarker}" />
          </radialGradient>
          
          <!-- Bottom-right corner (SAME gradient style as top-right) -->
          <radialGradient id="gradBR" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${W}" gradientTransform="matrix(0.7 -0.75 0.75 0.7 0 ${F.BOTTOM_BAND})">
            <stop offset="0.50" stop-color="${colors.frame}" />
            <stop offset="0.75" stop-color="${colors.frameDark}" />
            <stop offset="1" stop-color="${colors.frameDarker}" />
          </radialGradient>
          
          <!-- TOP BAND: vertical gradient, dark at TOP edge, light at 50% -->
          <linearGradient id="topBand" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${colors.frameDarker}" />
            <stop offset="50%" stop-color="${colors.frame}" />
          </linearGradient>
          
          <!-- BOTTOM BAND: vertical gradient, light at 50%, dark at BOTTOM edge -->
          <linearGradient id="bottomBand" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="50%" stop-color="${colors.frame}" />
            <stop offset="100%" stop-color="${colors.frameDarker}" />
          </linearGradient>
          
          <!-- LEFT SIDE: horizontal gradient, dark at LEFT edge, light at 50% -->
          <linearGradient id="leftSide" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${colors.frameDarker}" />
            <stop offset="50%" stop-color="${colors.frame}" />
          </linearGradient>
          
          <!-- RIGHT SIDE: horizontal gradient, light at 50%, dark at RIGHT edge -->
          <linearGradient id="rightSide" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="50%" stop-color="${colors.frame}" />
            <stop offset="100%" stop-color="${colors.frameDarker}" />
          </linearGradient>
        </defs>

        <g transform="translate(${PAD}, ${PAD})">
          
          <!-- ═══════════════ CASSETTE BACKGROUND ═══════════════ -->
          <rect x="0" y="0" width="${totalW}" height="${F.CASSETTE_HEIGHT}" rx="${R}" ry="${R}" fill="${colors.frame}" />
          <rect x="0" y="${F.CASSETTE_HEIGHT - R}" width="${totalW}" height="${R}" fill="${colors.frame}" />
          
          <g class="cassette">
            
            <!-- ═══ LEFT END ═══ -->
            <g class="left-end">
              <!-- Top-left corner -->
              <path d="${this.pathTopLeft(0, 0, W, H, R)}" fill="url(#gradTL)" />
              
              <!-- Middle band -->
              <rect x="0" y="${H}" width="${W}" height="${F.MIDDLE_BAND}" fill="url(#leftSide)" />
              
              <!-- Bottom-left corner (mirrored) -->
              <path d="${this.pathBottomLeft(0, H + F.MIDDLE_BAND, W, F.BOTTOM_BAND, R)}" fill="url(#gradBL)" />
            </g>
            
            <!-- ═══ CONTAINER ═══ -->
            <g class="container" transform="translate(${W}, 0)">
              <rect x="0" y="0" width="${containerW}" height="${H}" fill="url(#topBand)" />
              <rect x="0" y="${H}" width="${containerW}" height="${F.MIDDLE_BAND}" fill="${colors.frame}" />
              <rect x="0" y="${H + F.MIDDLE_BAND}" width="${containerW}" height="${F.BOTTOM_BAND}" fill="url(#bottomBand)" />
            </g>
            
            <!-- ═══ SOLAR PANEL ═══ -->
            <g class="container-fixed" transform="translate(${W + containerW}, 0)">
              <rect x="0" y="0" width="${solarPanelW}" height="${H}" fill="url(#topBand)" />
              <rect x="0" y="${H}" width="${solarPanelW}" height="${F.MIDDLE_BAND}" fill="${colors.solarPanel}" class="solar-panel" />
              <rect x="0" y="${H + F.MIDDLE_BAND}" width="${solarPanelW}" height="${F.BOTTOM_BAND}" fill="url(#bottomBand)" />
            </g>
            
            <!-- ═══ RIGHT END ═══ -->
            <g class="right-end" transform="translate(${totalW - W}, 0)">
              <!-- Top-right corner -->
              <path d="${this.pathTopRight(0, 0, W, H, R)}" fill="url(#gradTR)" />
              
              <!-- Middle band -->
              <rect x="0" y="${H}" width="${W}" height="${F.MIDDLE_BAND}" fill="url(#rightSide)" />
              
              <!-- Bottom-right corner (mirrored) -->
              <path d="${this.pathBottomRight(0, H + F.MIDDLE_BAND, W, F.BOTTOM_BAND, R)}" fill="url(#gradBR)" />
            </g>
            
          </g>
          
          <!-- ═══════════════ RAILS & FABRIC ═══════════════ -->
          <g class="rails-fabric" transform="translate(0, ${F.CASSETTE_HEIGHT})">
            <rect x="0" y="0" width="${F.RAIL_WIDTH}" height="${railsH}" fill="${colors.frame}" />
            <rect x="${F.RAIL_WIDTH}" y="0" width="${fabricW}" height="${fabricH}" fill="${colors.fabric}" opacity="${fabricOpacity}" class="fabric-rect" />
            <rect x="${F.RAIL_WIDTH}" y="${fabricH}" width="${fabricW}" height="${F.BOTTOM_PLATE_HEIGHT}" fill="${colors.frame}" />
            <rect x="${totalW - F.RAIL_WIDTH}" y="0" width="${F.RAIL_WIDTH}" height="${railsH}" fill="${colors.frame}" />
          </g>
          
        </g>
      `;
    }
  }

  window.SVGScreenConfigurator = new SVGScreenConfigurator();
})();
