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
      this.isScreenOpen = false;
      this.showMeasurements = true;

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
        FRAME_WHITE_DARK: '#F0F0F0',
        FRAME_WHITE_DARKER: '#E5E5E5',
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
      this.bindToggleButton();
      this.bindMeasurementsToggle();
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
        cassetteSize: 'slim',
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
        if (['width', 'height', 'frameColor', 'fabricColor', 'fabricType', 'cassetteSize', 'motor'].includes(field)) {
          const state = this.getCurrentState();
          state[field] =
            field === 'width' || field === 'height' ? parseInt(event.target.value) || 0 : event.target.value;
          this.updateFromState(state);
        }
      });
    }

    bindToggleButton() {
      const toggleBtn = this.container.querySelector('.screen-toggle-btn');
      if (!toggleBtn) return;

      toggleBtn.addEventListener('click', () => {
        this.isScreenOpen = !this.isScreenOpen;
        this.updateScreenState();
      });
    }

    bindMeasurementsToggle() {
      const measurementsBtn = this.container.querySelector('.measurements-toggle-btn');
      if (!measurementsBtn) return;

      measurementsBtn.addEventListener('click', () => {
        this.showMeasurements = !this.showMeasurements;
        this.updateMeasurementsVisibility();
      });
    }

    updateMeasurementsVisibility() {
      const measurementsBtn = this.container.querySelector('.measurements-toggle-btn');
      const measurementsText = measurementsBtn?.querySelector('.measurements-toggle-text');
      const measurementLines = this.svg.querySelector('.measurement-lines');

      if (measurementsBtn) {
        measurementsBtn.dataset.measurementsVisible = this.showMeasurements ? 'true' : 'false';
      }
      if (measurementsText) {
        measurementsText.textContent = this.showMeasurements ? 'Hide measurements' : 'Show measurements';
      }
      if (measurementLines) {
        measurementLines.style.opacity = this.showMeasurements ? '1' : '0';
        measurementLines.style.transition = 'opacity 0.2s ease';
      }
    }

    updateScreenState(skipAnimation = false) {
      const toggleBtn = this.container.querySelector('.screen-toggle-btn');
      const toggleText = toggleBtn?.querySelector('.screen-toggle-text');
      const fabricRect = this.svg.querySelector('.fabric-rect');
      const bottomPlate = this.svg.querySelector('.bottom-plate');

      if (!fabricRect || !bottomPlate) return;

      // Get current configuration for calculations
      const state = this.getCurrentState();
      const { height, cassetteSize } = state;

      // Calculate cassette height
      const isLarge =
        cassetteSize && (String(cassetteSize).toLowerCase().includes('large') || String(cassetteSize).includes('120'));
      const cassH = this.FIXED.CASSETTE_HEIGHT * (isLarge ? 1.4 : 1.0);

      // Calculate dimensions
      const totalH = Math.max(height * this.PX_PER_MM, 150);
      const railsH = totalH - cassH;
      const fullFabricH = railsH - this.FIXED.BOTTOM_PLATE_HEIGHT;

      // When open, fabric is just a tiny line
      const TINY_FABRIC_HEIGHT = 2;

      // Target values
      const targetFabricH = this.isScreenOpen ? TINY_FABRIC_HEIGHT : fullFabricH;
      const targetBottomY = this.isScreenOpen ? TINY_FABRIC_HEIGHT : fullFabricH;

      // If skipping animation, set values directly without animating
      if (skipAnimation) {
        fabricRect.setAttribute('height', targetFabricH);
        bottomPlate.setAttribute('y', targetBottomY);
      } else {
        // Animation configuration
        const duration = this.isScreenOpen ? 500 : 400; // ms
        const easing = this.isScreenOpen
          ? (t) => 1 - Math.pow(1 - t, 3) // ease-out cubic for opening
          : (t) => 1 - Math.pow(1 - t, 2); // ease-out quad for closing (smoother)

        // Get current values
        const startFabricH = parseFloat(fabricRect.getAttribute('height')) || fullFabricH;
        const startBottomY = parseFloat(bottomPlate.getAttribute('y')) || fullFabricH;

        // Animate
        const startTime = performance.now();

        const animate = (currentTime) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easedProgress = easing(progress);

          // Interpolate values
          const currentFabricH = startFabricH + (targetFabricH - startFabricH) * easedProgress;
          const currentBottomY = startBottomY + (targetBottomY - startBottomY) * easedProgress;

          // Apply values
          fabricRect.setAttribute('height', currentFabricH);
          bottomPlate.setAttribute('y', currentBottomY);

          // Continue animation if not complete
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };

        requestAnimationFrame(animate);
      }

      // Update button text
      if (toggleBtn) {
        toggleBtn.dataset.screenState = this.isScreenOpen ? 'open' : 'closed';
      }
      if (toggleText) {
        toggleText.textContent = this.isScreenOpen ? 'Close screen' : 'Open screen';
      }
    }

    getCurrentState() {
      return {
        width: parseInt(this.container.dataset.width) || 1500,
        height: parseInt(this.container.dataset.height) || 1000,
        frameColor: this.container.dataset.frameColor || 'anthracite',
        fabricColor: this.container.dataset.fabricColor || 'charcoal',
        fabricType: this.container.dataset.fabricType || '4-percent',
        cassetteSize: this.container.dataset.cassetteSize || 'slim',
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
          cassetteSize: s.cassetteSize || 'slim',
          motor: s.motor || 'wired',
        });
      }
    }

    updateFromState(state) {
      if (!this.initialized) return;

      const { width, height, frameColor, fabricColor, fabricType, cassetteSize, motor } = state;

      Object.assign(this.container.dataset, {
        width,
        height,
        frameColor,
        fabricColor,
        fabricType,
        cassetteSize,
        motor,
      });

      const colors = this.getColors(frameColor, fabricColor, motor);

      // Very subtle smoothing effect
      this.svg.style.transition = 'opacity 0.15s ease';
      this.svg.style.opacity = '0.95';

      this.renderSVG(width, height, colors, fabricType, cassetteSize);
      this.updateDimensionLabels(width, height);
      this.updateThumbnail(colors, motor);

      // Restore screen open/close state after re-render (without animation)
      if (this.isScreenOpen) {
        requestAnimationFrame(() => this.updateScreenState(true));
      }

      // Fade back to full opacity
      requestAnimationFrame(() => {
        this.svg.style.opacity = '1';
      });
    }

    updateThumbnail(colors, motor) {
      const thumbSvg = document.getElementById('configurator-thumbnail-svg');
      if (!thumbSvg) return;

      // Update frame parts (cassette, rails, bottom bar)
      // Use frame color for fill, and frameDarker for stroke/border to give definition
      const frameParts = thumbSvg.querySelectorAll(
        '[data-thumb-part="cassette"], [data-thumb-part="rail-left"], [data-thumb-part="rail-right"], [data-thumb-part="bottom-bar"]',
      );
      frameParts.forEach((part) => {
        part.setAttribute('fill', colors.frame);
        part.setAttribute('stroke', colors.frameDarker);
      });

      // Update fabric
      const fabric = thumbSvg.querySelector('[data-thumb-part="fabric"]');
      if (fabric) {
        fabric.setAttribute('fill', colors.fabric);
      }

      // Update solar panel visibility
      const solarPanel = thumbSvg.querySelector('[data-thumb-part="solar-panel"]');
      if (solarPanel) {
        if (motor === 'solar') {
          solarPanel.style.display = 'block';
          solarPanel.setAttribute('fill', colors.solarPanel);
        } else {
          solarPanel.style.display = 'none';
        }
      }
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

    renderSVG(widthMM, heightMM, colors, fabricType, cassetteSize) {
      const F = this.FIXED;

      // Calculate dynamic cassette dimensions
      const isLarge =
        cassetteSize && (String(cassetteSize).toLowerCase().includes('large') || String(cassetteSize).includes('120'));
      const heightMult = isLarge ? 1.4 : 1.0;

      const cassH = F.CASSETTE_HEIGHT * heightMult;
      const middleBand = cassH - F.TOP_BAND - F.BOTTOM_BAND;

      const totalW = Math.max(widthMM * this.PX_PER_MM, 200);
      const totalH = Math.max(heightMM * this.PX_PER_MM, 150);

      const solarPanelW = Math.min(F.SOLAR_PANEL_WIDTH * (totalW / 1000), totalW * 0.3);
      const containerW = totalW - F.END_CAP_WIDTH * 2 - solarPanelW;

      const railsH = totalH - cassH;
      const fabricW = totalW - F.RAIL_WIDTH * 2;
      const fullFabricH = railsH - F.BOTTOM_PLATE_HEIGHT;

      // Use correct fabric height based on screen state (open = tiny, closed = full)
      const TINY_FABRIC_HEIGHT = 2;
      const fabricH = this.isScreenOpen ? TINY_FABRIC_HEIGHT : fullFabricH;

      const fabricOpacity = fabricType === 'blackout' ? 1 : 0.92;

      const PAD = 15;
      const MEASUREMENT_AREA = 50; // Extra space for measurement lines on the right
      const viewW = totalW + PAD * 2 + MEASUREMENT_AREA;
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
          
          <!-- Bottom-left corner (gradient angle flipped from top-left) -->
          <radialGradient id="gradBL" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${W}" gradientTransform="matrix(-0.7 0.75 0.75 0.7 ${W} ${H + middleBand})">
            <stop offset="0.50" stop-color="${colors.frame}" />
            <stop offset="0.75" stop-color="${colors.frameDark}" />
            <stop offset="1" stop-color="${colors.frameDarker}" />
          </radialGradient>
          
          <!-- Bottom-right corner (gradient angle flipped from top-right) -->
          <radialGradient id="gradBR" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${W}" gradientTransform="matrix(0.7 0.75 0.75 -0.7 0 ${H + middleBand})">
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
          <rect x="0" y="0" width="${totalW}" height="${cassH}" rx="${R}" ry="${R}" fill="${colors.frame}" />
          <rect x="0" y="${cassH - R}" width="${totalW}" height="${R}" fill="${colors.frame}" />
          
          <g class="cassette">
            
            <!-- ═══ LEFT END ═══ -->
            <g class="left-end">
              <!-- Top-left corner -->
              <path d="${this.pathTopLeft(0, 0, W, H, R)}" fill="url(#gradTL)" />
              
              <!-- Middle band -->
              <rect x="0" y="${H}" width="${W}" height="${middleBand}" fill="url(#leftSide)" />
              
              <!-- Bottom-left corner (mirrored) -->
              <path d="${this.pathBottomLeft(0, H + middleBand, W, F.BOTTOM_BAND, R)}" fill="url(#gradBL)" />
            </g>
            
            <!-- ═══ CONTAINER ═══ -->
            <g class="container" transform="translate(${W}, 0)">
              <rect x="0" y="0" width="${containerW}" height="${H}" fill="url(#topBand)" />
              <rect x="0" y="${H}" width="${containerW}" height="${middleBand}" fill="${colors.frame}" />
              <rect x="0" y="${H + middleBand}" width="${containerW}" height="${F.BOTTOM_BAND}" fill="url(#bottomBand)" />
            </g>
            
            <!-- ═══ SOLAR PANEL ═══ -->
            <g class="container-fixed" transform="translate(${W + containerW}, 0)">
              <rect x="0" y="0" width="${solarPanelW}" height="${H}" rx="1" ry="1" fill="url(#topBand)" />
              <rect x="0" y="${H}" width="${solarPanelW}" height="${middleBand}" rx="1" ry="1" fill="${colors.solarPanel}" class="solar-panel" />
              <rect x="0" y="${H + middleBand}" width="${solarPanelW}" height="${F.BOTTOM_BAND}" rx="1" ry="1" fill="url(#bottomBand)" />
            </g>
            
            <!-- ═══ RIGHT END ═══ -->
            <g class="right-end" transform="translate(${totalW - W}, 0)">
              <!-- Top-right corner -->
              <path d="${this.pathTopRight(0, 0, W, H, R)}" fill="url(#gradTR)" />
              
              <!-- Middle band -->
              <rect x="0" y="${H}" width="${W}" height="${middleBand}" fill="url(#rightSide)" />
              
              <!-- Bottom-right corner (mirrored) -->
              <path d="${this.pathBottomRight(0, H + middleBand, W, F.BOTTOM_BAND, R)}" fill="url(#gradBR)" />
            </g>
            
          </g>
          
          <!-- ═══════════════ RAILS & FABRIC ═══════════════ -->
          <g class="rails-fabric" transform="translate(0, ${cassH})">
            <rect x="0" y="0" width="${F.RAIL_WIDTH}" height="${railsH}" fill="${colors.frame}" class="rail-left" />
            <rect x="${F.RAIL_WIDTH}" y="0" width="${fabricW}" height="${fabricH}" fill="${colors.fabric}" opacity="${fabricOpacity}" class="fabric-rect" />
            <rect x="${F.RAIL_WIDTH}" y="${fabricH}" width="${fabricW}" height="${F.BOTTOM_PLATE_HEIGHT}" fill="${colors.frame}" class="bottom-plate" />
            <rect x="${totalW - F.RAIL_WIDTH}" y="0" width="${F.RAIL_WIDTH}" height="${railsH}" fill="${colors.frame}" class="rail-right" />
          </g>
          
        </g>
      `;

      // Render measurement lines after main SVG
      this.renderMeasurementLines(widthMM, heightMM, cassetteSize, PAD, totalW, totalH);
    }

    renderMeasurementLines(widthMM, heightMM, cassetteSize, PAD, totalW, totalH) {
      const isLarge =
        cassetteSize && (String(cassetteSize).toLowerCase().includes('large') || String(cassetteSize).includes('120'));
      const cassetteHeightMM = isLarge ? 120 : 85;

      const SIDE_RAILS_MM = 64;
      const BOTTOM_RAIL_MM = 20;

      const lightOpeningWidth = widthMM - SIDE_RAILS_MM;
      const lightOpeningHeight = heightMM - cassetteHeightMM - BOTTOM_RAIL_MM;

      const F = this.FIXED;
      const cassH = F.CASSETTE_HEIGHT * (isLarge ? 1.4 : 1.0);

      const outsideOffset = 25;
      const outsideWidthY = cassH + (totalH - cassH) * 0.35;
      const insideWidthY = cassH + (totalH - cassH) * 0.45;
      const outsideHeightX = totalW + outsideOffset;
      const insideHeightX = totalW + outsideOffset - 30;
      const arrowSize = 6; // Arrow length
      const arrowSpread = 2; // Arrow width (smaller = sharper)

      const measurementGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      measurementGroup.setAttribute('class', 'measurement-lines');
      measurementGroup.setAttribute('transform', `translate(${PAD}, ${PAD})`);

      const createArrow = (x, y, direction, color) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let d = '';
        switch (direction) {
          case 'left':
            d = `M ${x} ${y} L ${x + arrowSize} ${y - arrowSpread} M ${x} ${y} L ${x + arrowSize} ${y + arrowSpread}`;
            break;
          case 'right':
            d = `M ${x} ${y} L ${x - arrowSize} ${y - arrowSpread} M ${x} ${y} L ${x - arrowSize} ${y + arrowSpread}`;
            break;
          case 'up':
            d = `M ${x} ${y} L ${x - arrowSpread} ${y + arrowSize} M ${x} ${y} L ${x + arrowSpread} ${y + arrowSize}`;
            break;
          case 'down':
            d = `M ${x} ${y} L ${x - arrowSpread} ${y - arrowSize} M ${x} ${y} L ${x + arrowSpread} ${y - arrowSize}`;
            break;
        }
        path.setAttribute('d', d);
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', '1.5');
        path.setAttribute('vector-effect', 'non-scaling-stroke'); // Keep arrow size constant
        path.setAttribute('fill', 'none');
        return path;
      };

      const createLine = (x1, y1, x2, y2, color) => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '1.5');
        line.setAttribute('vector-effect', 'non-scaling-stroke'); // Keep line width constant
        line.setAttribute('stroke-dasharray', '6, 4');
        return line;
      };

      // Calculate label scale factor - linear scaling based on screen size
      // Reference: 1500mm = 1.0x, scales linearly from there
      const maxDimension = Math.max(widthMM, heightMM);
      const referenceSize = 1500;
      const labelScale = Math.max(1.0, maxDimension / referenceSize);

      const createLabel = (x, y, text, rotate = false) => {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textEl.setAttribute('font-family', 'Inter, sans-serif');
        textEl.setAttribute('font-size', `${10 * labelScale}`);
        textEl.setAttribute('font-weight', '500');
        textEl.setAttribute('fill', '#374151');
        textEl.setAttribute('text-anchor', 'middle');
        textEl.setAttribute('dominant-baseline', 'middle');
        textEl.textContent = text;

        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('fill', 'rgba(255, 255, 255, 0.95)');
        bgRect.setAttribute('rx', `${4 * labelScale}`);
        bgRect.setAttribute('ry', `${4 * labelScale}`);
        const textWidth = (text.length * 6 + 18) * labelScale;
        const textHeight = 16 * labelScale;
        bgRect.setAttribute('width', textWidth);
        bgRect.setAttribute('height', textHeight);
        bgRect.setAttribute('x', -textWidth / 2);
        bgRect.setAttribute('y', -textHeight / 2);

        group.appendChild(bgRect);
        group.appendChild(textEl);
        group.setAttribute('transform', rotate ? `translate(${x}, ${y}) rotate(90)` : `translate(${x}, ${y})`);
        return group;
      };

      const ORANGE = '#E67E22';
      const BLUE = '#3498DB';

      // Outside measurements (Orange)
      measurementGroup.appendChild(createLine(0, outsideWidthY, totalW, outsideWidthY, ORANGE));
      measurementGroup.appendChild(createArrow(0, outsideWidthY, 'left', ORANGE));
      measurementGroup.appendChild(createArrow(totalW, outsideWidthY, 'right', ORANGE));
      measurementGroup.appendChild(createLabel(totalW / 2, outsideWidthY, `${widthMM} mm`));

      measurementGroup.appendChild(createLine(outsideHeightX, 0, outsideHeightX, totalH, ORANGE));
      measurementGroup.appendChild(createArrow(outsideHeightX, 0, 'up', ORANGE));
      measurementGroup.appendChild(createArrow(outsideHeightX, totalH, 'down', ORANGE));
      measurementGroup.appendChild(createLabel(outsideHeightX, totalH / 2, `${heightMM} mm`, true));

      // Light opening measurements (Blue)
      const insideStartX = F.RAIL_WIDTH;
      const insideEndX = totalW - F.RAIL_WIDTH;
      measurementGroup.appendChild(createLine(insideStartX, insideWidthY, insideEndX, insideWidthY, BLUE));
      measurementGroup.appendChild(createArrow(insideStartX, insideWidthY, 'left', BLUE));
      measurementGroup.appendChild(createArrow(insideEndX, insideWidthY, 'right', BLUE));
      measurementGroup.appendChild(
        createLabel((insideStartX + insideEndX) / 2, insideWidthY, `${lightOpeningWidth} mm`),
      );

      // Light opening height - positioned inside the fabric area, from below cassette to bottom of side rails
      const lightOpeningHeightX = totalW - F.RAIL_WIDTH - 25; // Inside the fabric, moved more to the left
      const insideStartY = cassH + F.BOTTOM_BAND * 2; // Start further below cassette (in fabric area)
      const insideEndY = totalH; // End at bottom of side rails (light opening when screen is fully down)
      measurementGroup.appendChild(
        createLine(lightOpeningHeightX, insideStartY, lightOpeningHeightX, insideEndY, BLUE),
      );
      measurementGroup.appendChild(createArrow(lightOpeningHeightX, insideStartY, 'up', BLUE));
      measurementGroup.appendChild(createArrow(lightOpeningHeightX, insideEndY, 'down', BLUE));
      measurementGroup.appendChild(
        createLabel(lightOpeningHeightX, (insideStartY + insideEndY) / 2, `${lightOpeningHeight} mm`, true),
      );

      this.svg.appendChild(measurementGroup);

      if (!this.showMeasurements) {
        measurementGroup.style.opacity = '0';
      }
    }
  }

  window.SVGScreenConfigurator = new SVGScreenConfigurator();
})();
