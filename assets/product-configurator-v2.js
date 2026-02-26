console.log('🚀 Product Configurator Script Executing...');

class ProductConfigurator extends HTMLElement {
  constructor() {
    super();
    this.state = {
      screens: [], // Array of screen objects
      installationType: 'diy',
      addons: {}, // { prodId: qty }
    };
  }

  /* --- Slider Navigation Helpers --- */

  /**
   * Jump to a specific slide by its ID fragment (e.g., 'svg-configurator' or media ID)
   */
  jumpToSlide(slideIdFragment) {
    const slide = document.querySelector(`[id*="${slideIdFragment}"]`);
    if (slide) {
      slide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });

      // Update thumbnail active state
      const gallery = document.querySelector('media-gallery');
      if (gallery) {
        const thumbnails = gallery.querySelectorAll('.thumbnail');
        thumbnails.forEach((thumb) => {
          if (thumb.dataset.target && thumb.dataset.target.includes(slideIdFragment)) {
            thumbnails.forEach((t) => t.classList.remove('active'));
            thumb.classList.add('active');
          }
        });
      }
    }
  }

  /**
   * Jump to the SVG configurator slide
   */
  jumpToSVGConfigurator() {
    this.jumpToSlide('svg-configurator');
  }

  /**
   * Get the currently active/expanded screen, or the first screen as fallback
   */
  getActiveScreen() {
    const activeScreen = this.state.screens.find((s) => s.expanded);
    return activeScreen || this.state.screens[0] || null;
  }

  /**
   * Jump to the first product image slide and update it with the dynamic image
   * Uses the currently active/expanded screen's options
   */
  jumpToFirstSlideWithImage() {
    const activeScreen = this.getActiveScreen();
    if (!activeScreen) return;

    // Build the dynamic image URL based on active screen's selections
    const imageUrl = this.buildDynamicImageUrl(activeScreen);

    if (imageUrl) {
      // Find and update the first product image
      this.updateFirstProductImage(imageUrl);
    }

    // Jump to the first slide (not SVG configurator)
    const slider = document.querySelector('[id*="Slider-Gallery-"]');
    if (slider) {
      const firstSlide = slider.querySelector('.slider__slide:first-child');
      if (firstSlide) {
        firstSlide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });

        // Update thumbnail active state - find the first non-configurator thumbnail
        const gallery = document.querySelector('media-gallery');
        if (gallery) {
          const thumbnails = gallery.querySelectorAll('.thumbnail');
          thumbnails.forEach((t) => t.classList.remove('active'));
          const firstThumb = gallery.querySelector('.thumbnail:not(.thumbnail--configurator)');
          if (firstThumb) {
            firstThumb.classList.add('active');
          }
        }
      }
    }
  }

  /**
   * Build the dynamic product image URL based on selected options
   * Uses pre-generated Shopify CDN URLs from ScreenluxData.assets.productImages
   */
  buildDynamicImageUrl(screen) {
    // Map option IDs to 3-letter codes
    const frameCodeMap = {
      anthracite: 'ant',
      white: 'whi',
    };

    const fabricColorCodeMap = {
      charcoal: 'cha',
      gray: 'gra',
    };

    const fabricTypeCodeMap = {
      '5-percent': '4tr',
      blackout: '0tr',
    };

    const motorCodeMap = {
      solar: 'sol',
      wired: 'wir',
    };

    // Get codes with defaults
    const frameCode = frameCodeMap[screen.frameColor] || 'ant';
    const fabricColorCode = fabricColorCodeMap[screen.fabricColor] || 'cha';
    const fabricTypeCode = fabricTypeCodeMap[screen.fabricType] || '0tr';
    const motorCode = motorCodeMap[screen.motor] || 'sol';

    // Build the key to look up in productImages
    const imageKey = `${frameCode}-${fabricColorCode}-${fabricTypeCode}-${motorCode}`;

    // Get the URL from ScreenluxData.assets.productImages
    if (this.data && this.data.assets && this.data.assets.productImages) {
      const imageUrl = this.data.assets.productImages[imageKey];
      if (imageUrl) {
        return imageUrl;
      }
    }

    // Fallback - return null if image not found
    console.warn(`Product image not found for key: ${imageKey}`);
    return null;
  }

  /**
   * Preload all product images for faster switching
   */
  preloadProductImages() {
    if (this.data && this.data.assets && this.data.assets.productImages) {
      Object.values(this.data.assets.productImages).forEach((url) => {
        const img = new Image();
        img.src = url;
      });
    }
  }

  /**
   * Setup mobile sticky gallery behavior
   * Gallery image stays fixed at top on mobile once user scrolls past it,
   * until reaching the installation section where it fades out.
   */
  setupMobileStickyGallery() {
    // Only apply on mobile
    const isMobile = () => window.innerWidth <= 749;

    const gallery = document.querySelector('.screenlux-gallery');
    if (!gallery) return;

    const sliderComponent = gallery.querySelector('slider-component');
    if (!sliderComponent) return;

    let isCurrentlySticky = false;
    let isFading = false;
    let galleryOriginalTop = null;
    let wasDismissedAtInstallation = false;

    // Set the CSS variable for placeholder height
    const updateSliderHeight = () => {
      if (sliderComponent) {
        const height = sliderComponent.offsetHeight;
        gallery.style.setProperty('--mobile-slider-height', `${height}px`);
      }
    };

    // Get gallery's original position (call before making it sticky)
    const getGalleryTop = () => {
      if (galleryOriginalTop === null) {
        // Store the original top position relative to document
        galleryOriginalTop = gallery.getBoundingClientRect().top + window.scrollY;
      }
      return galleryOriginalTop;
    };

    // Function to update sticky state based on scroll position
    const updateStickyState = () => {
      if (!isMobile()) {
        gallery.classList.remove('mobile-sticky', 'fading-out', 'fading-in');
        isCurrentlySticky = false;
        galleryOriginalTop = null; // Reset for recalculation
        return;
      }

      const installationSection = document.getElementById('installation-section');
      const scrollY = window.scrollY;
      const originalTop = getGalleryTop();
      const sliderHeight = sliderComponent ? sliderComponent.offsetHeight : 300;

      // Check if we should stop being sticky (approaching installation section)
      if (installationSection) {
        const installRect = installationSection.getBoundingClientRect();
        if (installRect.top <= sliderHeight + 50) {
          if (isCurrentlySticky && !isFading) {
            // Start fade out - mark as dismissed so we fade in when returning
            isFading = true;
            wasDismissedAtInstallation = true;
            gallery.classList.add('fading-out');

            // After fade animation, remove sticky class
            setTimeout(() => {
              gallery.classList.remove('mobile-sticky', 'fading-out');
              isCurrentlySticky = false;
              isFading = false;
            }, 300);
          }
          return;
        }
      }

      // Check if we should become sticky (scrolled past gallery's original position)
      if (scrollY > originalTop) {
        if (!isCurrentlySticky && !isFading) {
          updateSliderHeight();

          // If we were dismissed at installation, fade in when re-appearing
          if (wasDismissedAtInstallation) {
            gallery.classList.add('mobile-sticky', 'fading-in');
            gallery.classList.remove('fading-out');
            isCurrentlySticky = true;

            // Remove fading-in class after animation completes
            setTimeout(() => {
              gallery.classList.remove('fading-in');
              wasDismissedAtInstallation = false;
            }, 300);
          } else {
            // First time becoming sticky - no animation
            gallery.classList.add('mobile-sticky');
            gallery.classList.remove('fading-out');
            isCurrentlySticky = true;
          }
        }
      } else {
        // Should NOT be sticky - gallery is still in view
        if (isCurrentlySticky && !isFading) {
          gallery.classList.remove('mobile-sticky', 'fading-out', 'fading-in');
          isCurrentlySticky = false;
        }
      }
    };

    // Listen to scroll events with throttling
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateStickyState();
          ticking = false;
        });
        ticking = true;
      }
    });

    // Also listen to resize in case viewport changes
    window.addEventListener('resize', () => {
      galleryOriginalTop = null; // Reset for recalculation
      if (!isMobile()) {
        gallery.classList.remove('mobile-sticky', 'fading-out');
        isCurrentlySticky = false;
        isFading = false;
      } else {
        updateSliderHeight();
        updateStickyState();
      }
    });

    // Initial check (in case page loads already scrolled)
    if (isMobile()) {
      setTimeout(() => {
        updateSliderHeight();
        updateStickyState();
      }, 100);
    }
  }

  /**
   * Update the first product image in the gallery with the dynamic URL
   * Includes a smooth fade transition
   */
  updateFirstProductImage(imageUrl) {
    if (!imageUrl) return;

    const slider = document.querySelector('[id*="Slider-Gallery-"]');
    if (!slider) return;

    const firstSlide = slider.querySelector('.slider__slide:first-child');
    if (!firstSlide) return;

    const img = firstSlide.querySelector('img.gallery-image');
    if (img) {
      // Add transition class if not already present
      if (!img.classList.contains('dynamic-image-transition')) {
        img.classList.add('dynamic-image-transition');
      }

      // Fade out, change image, fade in
      img.style.opacity = '0';

      setTimeout(() => {
        img.src = imageUrl;
        img.srcset = `${imageUrl} 1066w`;

        // Wait for image to load then fade in
        if (img.complete) {
          img.style.opacity = '1';
        } else {
          img.onload = () => {
            img.style.opacity = '1';
          };
        }
      }, 150);
    }
  }

  connectedCallback() {
    this.init();
  }

  init() {
    try {
      // 1. Load Data
      this.data = window.ScreenluxData;
      if (!this.data) {
        throw new Error('ScreenluxData is undefined. Check console.');
      }

      // 0. Base Validation Check - "Unsure" injection removed as requested

      // 2. Initial State: 1 Screen (skip scroll on init)
      this.handleAddScreen(true);

      // 3. Initial Render
      this.render();

      // 4. Dispatch initial state for SVG configurator
      if (this.state.screens.length > 0) {
        const firstScreen = this.state.screens[0];
        document.dispatchEvent(
          new CustomEvent('screenlux:screen-updated', {
            detail: {
              width: firstScreen.width,
              height: firstScreen.height,
              frameColor: firstScreen.frameColor,
              fabricColor: firstScreen.fabricColor,
              fabricType: firstScreen.fabricType,
              cassetteSize: firstScreen.cassetteSize,
              motor: firstScreen.motor,
            },
          }),
        );
        document.dispatchEvent(new CustomEvent('screenlux:configurator-ready'));
      }

      // 5. Preload all product images for faster switching
      this.preloadProductImages();

      // 6. Setup mobile sticky gallery behavior
      this.setupMobileStickyGallery();
    } catch (err) {
      console.error('Configurator Init Error:', err);
      this.innerHTML = `
            <div style="padding: 20px; color: red; text-align: center; border: 1px solid red; margin: 20px;">
                <h3>Application Error</h3>
                <p>${err.message}</p>
                <small>${err.stack || ''}</small>
            </div>
        `;
    }
  }

  /* --- State Modifiers --- */

  handleAddScreen = (skipScroll = false) => {
    const newId = Date.now();
    this.state.screens.push({
      id: newId,
      width: 1500,
      height: 1000,
      frameColor: null,
      fabricColor: null,
      fabricType: null,
      cassetteSize: null,
      motor: null,
      expanded: true,
      valid: true,
      errors: {},
    });

    // Collapse others
    this.state.screens.forEach((s) => {
      if (s.id !== newId) s.expanded = false;
    });

    this.render();

    // Scroll to the new screen (last one) - unless skipScroll is true
    if (!skipScroll) {
      setTimeout(() => {
        const screens = this.querySelectorAll('details-accordion');
        const lastScreen = screens[screens.length - 1];
        if (lastScreen) {
          lastScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  handleDuplicateScreen = (index) => {
    const source = this.state.screens[index];
    const newScreen = JSON.parse(JSON.stringify(source));
    newScreen.id = Date.now();
    newScreen.expanded = true;

    // Collapse all
    this.state.screens.forEach((s) => (s.expanded = false));

    this.state.screens.splice(index + 1, 0, newScreen);
    this.render();

    // Scroll to the new screen (index + 1)
    setTimeout(() => {
      const screens = this.querySelectorAll('details-accordion');
      const newScreenEl = screens[index + 1];
      if (newScreenEl) {
        newScreenEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  updateScreen(index, field, value) {
    const screen = this.state.screens[index];

    // Type conversion for numbers
    if (field === 'width' || field === 'height') {
      value = parseInt(value) || 0;
    }

    screen[field] = value;

    // Run validation logic
    const v = window.ScreenluxEngine.validateDimensions(screen.width, screen.height);
    screen.valid = v.valid;
    screen.errors = v.valid ? {} : { dimension: v.error };

    // Dispatch event for SVG configurator (always use first screen for preview)
    if (this.state.screens.length > 0) {
      const firstScreen = this.state.screens[0];
      document.dispatchEvent(
        new CustomEvent('screenlux:screen-updated', {
          detail: {
            width: firstScreen.width,
            height: firstScreen.height,
            frameColor: firstScreen.frameColor,
            fabricColor: firstScreen.fabricColor,
            fabricType: firstScreen.fabricType,
            cassetteSize: firstScreen.cassetteSize,
            motor: firstScreen.motor,
          },
        }),
      );
    }

    // Handle slider navigation based on what field changed
    const optionFields = ['frameColor', 'fabricColor', 'fabricType', 'motor'];
    const measurementFields = ['width', 'height'];

    if (measurementFields.includes(field)) {
      // Jump to SVG configurator when measurements change
      this.jumpToSVGConfigurator();
    } else if (optionFields.includes(field)) {
      // Jump to first slide and update the dynamic product image
      this.jumpToFirstSlideWithImage();
    }

    this.render();
  }

  removeScreen(index) {
    if (this.state.screens.length <= 1) return;
    this.state.screens.splice(index, 1);

    // Determines which screen to focus after deletion logic
    // We want to focus the *previous* screen if possible, or the one that took its place (if it was the first one).
    if (this.state.screens.length > 0) {
      let newFocusIndex = index - 1;
      if (newFocusIndex < 0) newFocusIndex = 0;

      // Ensure the screen we fallback to is expanded
      this.state.screens[newFocusIndex].expanded = true;
      // Ensure others are collapsed to keep it clean
      this.state.screens.forEach((s, i) => {
        if (i !== newFocusIndex) s.expanded = false;
      });
    }

    this.render();

    // Scroll into view logic
    if (this.state.screens.length > 0) {
      setTimeout(() => {
        let newFocusIndex = index - 1;
        if (newFocusIndex < 0) newFocusIndex = 0;

        const screens = this.querySelectorAll('details-accordion');
        const targetScreen = screens[newFocusIndex];
        if (targetScreen) {
          targetScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  }

  toggleScreenAccordion(index) {
    // 1. Update internal state (for next render)
    const wasExpanded = this.state.screens[index].expanded;
    this.state.screens.forEach((s, i) => {
      s.expanded = i === index ? !s.expanded : false;
    });

    // 2. DOM Manipulation directly to avoid re-render killing animation
    const screens = this.querySelectorAll('details-accordion');

    screens.forEach((accordion, i) => {
      const details = accordion.querySelector('details');
      if (details) {
        if (i !== index) {
          // Close others if open
          if (details.open) {
            accordion.shrink();
          }
        }
        // For i === index, we let details-accordion handle the toggle itself
      }
    });

    // 3. Update the product image to reflect the newly expanded screen's options
    if (!wasExpanded && this.state.screens[index].expanded) {
      // Screen was just opened - update the product image
      const openedScreen = this.state.screens[index];
      const imageUrl = this.buildDynamicImageUrl(openedScreen);
      if (imageUrl) {
        this.updateFirstProductImage(imageUrl);
      }
    }

    // We do NOT call this.render() here to preserve the DOM for animation.
    // The state is updated so next time something else triggers render, it will be correct.
  }

  setInstallationType(type) {
    this.state.installationType = type;
    this.render();
  }

  handleGlobalSolar = () => {
    this.state.screens.forEach((s) => (s.motor = 'solar'));
    this.render();
  };

  updateAddon(id, qty) {
    this.state.addons[id] = qty;
    this.render();
  }

  /* --- Rendering --- */

  saveFocus() {
    const active = document.activeElement;
    if (!active || !this.contains(active)) return null;
    // Simple focus preservation strategy
    if (active.dataset.field) {
      // Return enough info to find it again essentially
      const allInputs = Array.from(this.querySelectorAll(`input[data-field="${active.dataset.field}"]`));
      const index = allInputs.indexOf(active);
      return { type: 'dimension', field: active.dataset.field, index };
    }
    return null;
  }

  restoreFocus(saved) {
    if (!saved) return;
    try {
      if (saved.type === 'dimension') {
        const allInputs = Array.from(this.querySelectorAll(`input[data-field="${saved.field}"]`));
        if (allInputs[saved.index]) {
          const el = allInputs[saved.index];
          el.focus();
          // Restore cursor position for text/number inputs
          if (el.type === 'text' || el.type === 'number') {
            const len = el.value.length;
            el.setSelectionRange(len, len);
          }
        }
      }
    } catch (e) {
      // Ignore focus errors
    }
  }

  render() {
    const savedFocus = this.saveFocus();

    // Build off-DOM
    const container = document.createElement('div');
    container.className = 'configurator-app';

    // 1. Screens Group
    const screensGroup = document.createElement('div');
    screensGroup.className = 'configurator-group-box';

    const screensContainer = document.createElement('div');
    screensContainer.className = 'screens-list';

    // Add Header for Screens Section
    screensContainer.innerHTML = '<label class="grouping-title">Configure your screens</label>';

    this.state.screens.forEach((screen, index) => {
      screensContainer.appendChild(this.renderScreenItem(screen, index));
    });
    screensGroup.appendChild(screensContainer);

    // 2. Add Screen Button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-dashed margin-top-sm';
    addBtn.innerHTML = `<span>+</span> Add another one`;
    addBtn.onclick = this.handleAddScreen;
    screensGroup.appendChild(addBtn);

    // 3. Global Solar Check (Upsell) - MOVED TO INSTALLATION SECTION

    // Add Screens Group to Main Container
    container.appendChild(screensGroup);

    // 4. Installation Section
    container.appendChild(this.renderInstallationSection());

    // 5. Add-ons Section
    container.appendChild(this.renderAddonsSection());

    // 6. Order Summary & Cart
    container.appendChild(this.renderOrderSummary());

    // 7. Award Section
    container.appendChild(this.renderAwardSection());

    // Atomic Swap
    this.replaceChildren(container);

    // Restore Focus
    this.restoreFocus(savedFocus);
  }

  // --- Helpers ---

  renderSelectionGrid(label, fieldName, options, selectedValue, index, type = 'text', layout = 'grid') {
    let gridClass = 'selection-grid';
    if (layout === 'vertical') gridClass = 'selection-grid--vertical';
    if (layout === 'horizontal') gridClass = 'selection-grid--horizontal';

    let html = `
      <div class="field margin-top-md">
        <label class="field-label">${label}</label>
        <div class="${gridClass}">
    `;

    options.forEach((opt) => {
      const isSelected = selectedValue === opt.id;
      const cardClass = layout === 'vertical' ? 'selection-card selection-card--vertical' : 'selection-card';

      let visual = '';
      if (opt.hex) {
        visual = `<div class="card-visual"><span class="color-dot" style="background:${opt.hex};"></span></div>`;
      } else if (opt.image) {
        if (layout === 'vertical') {
          visual = `<div class="card-visual"><img src="${opt.image}" alt="${opt.title}" class="fabric-swatch" /></div>`;
        } else {
          visual = `<div class="card-visual"><div class="fabric-swatch small" style="background-image: url('${opt.image}');"></div></div>`;
        }
      }

      html += `
        <label class="${cardClass} ${isSelected ? 'selected' : ''}">
          <input type="radio" name="${fieldName}_${index}" value="${opt.id}" data-field="${fieldName}" ${
            isSelected ? 'checked' : ''
          } class="hidden-input">
          ${visual}
          <div class="card-text-wrapper">
            <span class="card-title">${opt.title}</span>
            ${opt.ral ? `<span class="ral-code">${opt.ral}</span>` : ''}
            ${opt.desc ? `<span class="card-price">${opt.desc}</span>` : ''}
          </div>
        </label>
      `;
    });

    html += `</div></div>`;
    return html;
  }

  renderScreenItem(screen, index) {
    const wrapper = document.createElement('details-accordion');
    const rawCost = window.ScreenluxEngine.calculateScreenPrice(screen, this.data.config);
    const variant = window.ScreenluxEngine.matchVariant(rawCost, this.data.screens);
    const price = variant ? variant.price : rawCost;
    const compareAtPrice = variant ? variant.compare_at_price : price;

    const frameOptions = this.data.frameColors || [];
    const fabricColors = this.data.fabricColors || [];
    const fabricTypes = this.data.fabrics || [];
    const cassetteSizes = this.data.cassetteSizes || [];
    const motorOptions = this.data.motorOptions || [];

    // --- Summary Data Preparation ---
    // Helper to get title or null if not selected
    const getTitle = (currentVal, options) => {
      if (!currentVal) return null;
      const found = options.find((o) => o.id === currentVal);
      return found ? found.title : currentVal;
    };

    const frameLabel = getTitle(screen.frameColor, frameOptions);
    const fabricColorLabel = getTitle(screen.fabricColor, fabricColors);
    const fabricTypeLabel = getTitle(screen.fabricType, fabricTypes);

    let cassetteLabel = getTitle(screen.cassetteSize, cassetteSizes);
    // Clean up "Slim (85x85mm)" -> "Slim"
    if (cassetteLabel && cassetteLabel.includes('(')) {
      cassetteLabel = cassetteLabel.split('(')[0].trim();
    }

    const motorLabel = getTitle(screen.motor, motorOptions);

    // Build the list items dynamically
    const summaryItems = [];

    // 1. Dimensions (Always show if they exist, which they should)
    if (screen.width || screen.height) {
      summaryItems.push({ text: `${screen.width || 0} × ${screen.height || 0} mm`, class: '' });
    } else {
      summaryItems.push({ text: 'Dimensions not set', class: 'placeholder' });
    }

    // 2. Cassette
    if (cassetteLabel) {
      summaryItems.push({ text: cassetteLabel, class: '' });
    } else {
      summaryItems.push({ text: 'No cassette size selected', class: 'placeholder' });
    }

    // 3. Frame
    if (frameLabel) {
      summaryItems.push({ text: frameLabel, class: '' });
    } else {
      summaryItems.push({ text: 'No frame color selected', class: 'placeholder' });
    }

    // 4. Fabric (Color + Type)
    const fabricParts = [];
    if (fabricColorLabel) fabricParts.push(fabricColorLabel);
    if (fabricTypeLabel) fabricParts.push(fabricTypeLabel);

    if (fabricParts.length > 0) {
      summaryItems.push({ text: fabricParts.join(', '), class: '' });
    } else {
      summaryItems.push({ text: 'No fabric selected', class: 'placeholder' });
    }

    // 5. Motor
    if (motorLabel) {
      summaryItems.push({ text: motorLabel, class: '' });
    } else {
      summaryItems.push({ text: 'No motor selected', class: 'placeholder' });
    }

    wrapper.innerHTML = `
      <details ${screen.expanded ? 'open' : ''} class="${screen.valid ? '' : 'invalid'}">
        <summary>
          <div class="screen-summary-container">
             <div class="screen-info">
                <span class="screen-title">Screen ${index + 1}</span>
                <ul class="screen-summary-list">
                   ${summaryItems.map((item) => `<li class="${item.class}">${item.text}</li>`).join('')}
                </ul>
             </div>
             <div class="screen-price-container">
                 ${compareAtPrice > price ? `<span class="price-old" style="margin-right:8px;font-size:14px;align-self:center;">${(compareAtPrice / 100).toFixed(0)} €</span>` : ''}
                 <span class="screen-price">${(price / 100).toFixed(0)} €</span>
                 <svg class="accordion-chevron" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 9L12 15L18 9" stroke="#171717" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                 </svg>
             </div>
          </div>
        </summary>
        <div class="accordion-body accordion__content">
           <!-- Dimensions -->
           <div class="grid-2"> 
             <div class="field">
               <label class="field-label">Width (mm)</label>
               <input type="number" 
                      value="${screen.width}" 
                      data-field="width" 
                      class="sl-input ${screen.errors.dimension && !screen.width ? 'error' : ''}">
             </div>
             <div class="field">
               <label class="field-label">Height (mm)</label>
               <input type="number" 
                      value="${screen.height}" 
                      data-field="height"
                      class="sl-input ${screen.errors.dimension && !screen.height ? 'error' : ''}">
             </div>
           </div>
           
           ${
             !screen.valid
               ? `<div class="text-xs margin-top-xs" style="color:var(--sl-color-error)">⚠️ ${
                   screen.errors.dimension || 'Invalid dimensions'
                 }</div>`
               : ''
           }
           
           <!-- Cassette Size Selector -->
           ${this.renderSelectionGrid(
             'Cassette size',
             'cassetteSize',
             cassetteSizes,
             screen.cassetteSize,
             index,
             'image',
             'vertical',
           )}

           <!-- Frame Color Selector -->
           ${this.renderSelectionGrid(
             'Frame color',
             'frameColor',
             frameOptions,
             screen.frameColor,
             index,
             'color',
             'horizontal',
           )}

           <!-- Fabric Color Selector -->
           ${this.renderSelectionGrid(
             'Fabric color',
             'fabricColor',
             fabricColors,
             screen.fabricColor,
             index,
             'color',
             'horizontal',
           )}
           
           <!-- Fabric Type Selector -->
           ${this.renderSelectionGrid(
             'Fabric transparency',
             'fabricType',
             fabricTypes,
             screen.fabricType,
             index,
             'image',
             'vertical',
           )}

           <!-- Motor Selector -->
           ${this.renderSelectionGrid('Motor', 'motor', motorOptions, screen.motor, index, 'image', 'vertical')}
           
           <!-- Actions -->
           <div class="margin-top-md" style="display:flex; justify-content: space-between; align-items: center;">
              <button type="button" class="btn btn-text remove-screen-btn" style="color:var(--sl-color-error); padding:0; width:auto; display: inline-flex; align-items: center;">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px;">
                  <g clip-path="url(#clip0_128_400)">
                    <path d="M13.5 3H11.25V2.25C11.25 1.78587 11.0656 1.34075 10.7374 1.01256C10.4092 0.684374 9.96413 0.5 9.5 0.5H6.5C6.03587 0.5 5.59075 0.684374 5.26256 1.01256C4.93437 1.34075 4.75 1.78587 4.75 2.25V3H2.5C2.30109 3 2.11032 3.07902 1.96967 3.21967C1.82902 3.36032 1.75 3.55109 1.75 3.75C1.75 3.94891 1.82902 4.13968 1.96967 4.28033C2.11032 4.42098 2.30109 4.5 2.5 4.5H2.75V13C2.75 13.3315 2.8817 13.6495 3.11612 13.8839C3.35054 14.1183 3.66848 14.25 4 14.25H12C12.3315 14.25 12.6495 14.1183 12.8839 13.8839C13.1183 13.6495 13.25 13.3315 13.25 13V4.5H13.5C13.6989 4.5 13.8897 4.42098 14.0303 4.28033C14.171 4.13968 14.25 3.94891 14.25 3.75C14.25 3.55109 14.171 3.36032 14.0303 3.21967C13.8897 3.07902 13.6989 3 13.5 3ZM6.25 2.25C6.25 2.1837 6.27634 2.12011 6.32322 2.07322C6.37011 2.02634 6.4337 2 6.5 2H9.5C9.5663 2 9.62989 2.02634 9.67678 2.07322C9.72366 2.12011 9.75 2.1837 9.75 2.25V3H6.25V2.25ZM11.75 12.75H4.25V4.5H11.75V12.75ZM7.25 6.5V10.5C7.25 10.6989 7.17098 10.8897 7.03033 11.0303C6.88968 11.171 6.69891 11.25 6.5 11.25C6.30109 11.25 6.11032 11.171 5.96967 11.0303C5.82902 10.8897 5.75 10.6989 5.75 10.5V6.5C5.75 6.30109 5.82902 6.11032 5.96967 5.96967C6.11032 5.82902 6.30109 5.75 6.5 5.75C6.69891 5.75 6.88968 5.82902 7.03033 5.96967C7.17098 6.11032 7.25 6.30109 7.25 6.5ZM10.25 6.5V10.5C10.25 10.6989 10.171 10.8897 10.0303 11.0303C9.88968 11.171 9.69891 11.25 9.5 11.25C9.30109 11.25 9.11032 11.171 8.96967 11.0303C8.82902 10.8897 8.75 10.6989 8.75 10.5V6.5C8.75 6.30109 8.82902 6.11032 8.96967 5.96967C9.11032 5.82902 9.30109 5.75 9.5 5.75C9.69891 5.75 9.88968 5.82902 10.0303 5.96967C10.171 6.11032 10.25 6.30109 10.25 6.5Z" fill="#EF4444"/>
                  </g>
                  <defs>
                    <clipPath id="clip0_128_400">
                      <rect width="16" height="16" fill="white"/>
                    </clipPath>
                  </defs>
                </svg>
                Remove screen
              </button>
              <button type="button" class="btn btn-text duplicate-screen-btn" style="padding:0; width:auto; color: var(--sl-text-secondary); display: inline-flex; align-items: center;">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 6px;">
                  <path d="M13.5 1.75H5.5C5.30109 1.75 5.11032 1.82902 4.96967 1.96967C4.82902 2.11032 4.75 2.30109 4.75 2.5V4.75H2.5C2.30109 4.75 2.11032 4.82902 1.96967 4.96967C1.82902 5.11032 1.75 5.30109 1.75 5.5V13.5C1.75 13.6989 1.82902 13.8897 1.96967 14.0303C2.11032 14.171 2.30109 14.25 2.5 14.25H10.5C10.6989 14.25 10.8897 14.171 11.0303 14.0303C11.171 13.8897 11.25 13.6989 11.25 13.5V11.25H13.5C13.6989 11.25 13.8897 11.171 14.0303 11.0303C14.171 10.8897 14.25 10.6989 14.25 10.5V2.5C14.25 2.30109 14.171 2.11032 14.0303 1.96967C13.8897 1.82902 13.6989 1.75 13.5 1.75ZM9.75 12.75H3.25V6.25H9.75V12.75ZM12.75 9.75H11.25V5.5C11.25 5.30109 11.171 5.11032 11.0303 4.96967C10.8897 4.82902 10.6989 4.75 10.5 4.75H6.25V3.25H12.75V9.75Z" fill="#171717"/>
                </svg>
                Duplicate screen
              </button>
           </div>
        </div>
      </details>
    `;

    // Remove Listener
    const removeBtn = wrapper.querySelector('.remove-screen-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.removeScreen(index);
      });
    }

    // Duplicate Listener
    const duplicateBtn = wrapper.querySelector('.duplicate-screen-btn');
    if (duplicateBtn) {
      duplicateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleDuplicateScreen(index);
      });
    }

    // Event Delegation for inputs
    wrapper.querySelectorAll('input').forEach((input) => {
      input.addEventListener('change', (e) => {
        const field = e.target.dataset.field;
        if (field) {
          const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
          this.updateScreen(index, field, val);
        }
      });

      // Jump to SVG configurator when measurement inputs are focused
      if (input.dataset.field === 'width' || input.dataset.field === 'height') {
        input.addEventListener('focus', () => {
          this.jumpToSVGConfigurator();
        });
      }
    });

    // Handle Summary Click manually for Accordion State
    wrapper.querySelector('summary').addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleScreenAccordion(index);
    });

    return wrapper;
  }

  renderInstallationSection() {
    const section = document.createElement('div');
    section.className = 'configurator-group-box';
    section.id = 'installation-section';

    // 1. Group Title
    const title = document.createElement('label');
    title.className = 'grouping-title';
    title.textContent = 'Installation';
    section.appendChild(title);

    // 2. Global Solar Check (Upsell / Tip)
    // Show tip if any screen is NOT solar (i.e. wired or undefined)
    if (this.state.screens.some((s) => s.motor !== 'solar')) {
      const solarTip = document.createElement('div');
      solarTip.className = 'info-card-tip';

      solarTip.innerHTML = `
        <div class="info-card-header">
           <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="benefit-check" style="color:var(--sl-color-success)">
             <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm-2 15l-5-5 1.41-1.41L8 12.17l7.59-7.59L17 6l-9 9z" fill="currentColor"/>
           </svg>
           <span class="info-card-title">Tip</span>
        </div>
        <div class="info-card-body">
           <div class="info-card-message">
             Switch to <strong>Solar Driven</strong> screens to simplify installation and reduce costs.
           </div>
           <ul class="info-card-benefits">
             <li class="info-card-benefit">
               <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
               No wiring
             </li>
             <li class="info-card-benefit">
               <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
               No wall drilling for power
             </li>
             <li class="info-card-benefit">
               <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
               No electrician dependency
             </li>
           </ul>
           <div class="info-card-footer">
             <span class="info-card-footer-text">Switch now and save <strong>1200€</strong> on professional assembly.</span>
             <button type="button" class="info-card-btn">Switch to Solar</button>
           </div>
        </div>
      `;
      const btn = solarTip.querySelector('.info-card-btn');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleGlobalSolar();
        });
      }
      section.appendChild(solarTip);
    }

    // Installation type options
    const installationOptions = [
      {
        id: 'diy',
        title: 'Self-installation (DIY)',
        desc: 'Hassle-free self-assembly using our assembly manual and video guides.\n• Estimated assembly time:\n• 30 minutes per Solar driven screen\n• 5 hours per wired screen',
        price: 'Free',
      },
      {
        id: 'professional',
        title: 'Professional Installation',
        desc: 'Get the screen assembled by one of our professional installation companies.',
        price: '+ 2350 €',
        note: 'Save 1200 € by switching to Solar driven screens.',
      },
    ];

    // Render installation type selection using vertical cards
    // Note: Removed "grouping-title" from inside html because it is now at the top of the section
    const html = `
      <div class="field margin-top-md">
        <div class="selection-grid--vertical">
          ${installationOptions
            .map((opt) => {
              const isSelected = this.state.installationType === opt.id;

              // Standardized price rendering
              let priceDisplay = '';
              if (opt.price === 'Free') {
                priceDisplay =
                  '<span style="background-color: #A7F3D0; color: #064E3B; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">Free</span>';
              } else {
                // Ensure standardized look for other prices
                priceDisplay = `<span style="font-weight: 600; font-size: 14px;">${opt.price}</span>`;
              }

              return `
              <label class="selection-card selection-card--vertical ${isSelected ? 'selected' : ''}">
                <input type="radio" name="installationType" value="${opt.id}" ${
                  isSelected ? 'checked' : ''
                } class="hidden-input">
                <div class="card-text-wrapper" style="flex: 1;">
                  <span class="card-title">${opt.title}</span>
                  <span class="card-desc" style="white-space: pre-line; margin-top: 4px; display: block;">${
                    opt.desc
                  }</span>
                  <div style="margin-top: 8px;">${priceDisplay}</div>
                  ${
                    opt.note
                      ? `<span class="card-note" style="color: #F97316; font-size: 13px; margin-top: 4px; display: block;">${opt.note}</span>`
                      : ''
                  }
                </div>
              </label>
            `;
            })
            .join('')}
        </div>
      </div>
    `;

    const optionsContainer = document.createElement('div');
    optionsContainer.innerHTML = html;
    section.appendChild(optionsContainer);

    // Add event listeners for installation type
    section.querySelectorAll('input[name="installationType"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        this.setInstallationType(e.target.value);
      });
    });

    // DIY Brackets Section removed/hidden as requested
    /*
    if (this.state.installationType === 'diy') {
      // brackets code hidden
    }
    */

    return section;
  }

  renderBracketCard(bracket) {
    const isSelected = this.state.selectedBracketId === bracket.id;
    const priceText =
      bracket.price === 0
        ? '<span style="background-color: #A7F3D0; color: #064E3B; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">Free</span>'
        : `${(bracket.price / 100).toFixed(0)} € per screen`;

    // Custom image for Unsure or bracket image
    let imageHtml = '';
    // Special handling for the "Unsure" item if it comes from Shopify data or has id 'unsure'
    // But user requested to use price logic mainly. We will keep ID check just for specific image placeholder if needed,
    // or if the product coming from Shopify is likely to be the "Unsure" one.
    // Ideally we should use the product image from Shopify.
    // If bracket.image exists, use it.

    if (bracket.image) {
      imageHtml = `<img src="${bracket.image}" alt="${bracket.title}" style="width: 80px; height: 80px; object-fit: contain; border-radius: 8px; background: #F9FAFB; padding: 4px;">`;
    } else {
      // Fallback or specific placeholder if we want to detect "unsure" by title or id
      // For now, standard fallback
      imageHtml = `<div style="width: 80px; height: 80px; background: #F3F4F6; border-radius: 8px;"></div>`;
    }

    const label = document.createElement('label');
    label.className = `selection-card selection-card--vertical ${isSelected ? 'selected' : ''}`;
    label.style.cursor = 'pointer';

    label.innerHTML = `
      <input type="radio" name="bracket_selection" value="${bracket.id}" class="hidden-input" ${
        isSelected ? 'checked' : ''
      }>
      <div class="card-visual" style="margin-right: 16px;">
        ${imageHtml}
      </div>
      <div class="card-text-wrapper" style="flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
             <span class="card-title" style="font-weight: 600;">${bracket.title}</span>
        </div>
        <span class="card-desc" style="white-space: pre-line; margin-top: 4px; display: block; color: #6B7280; font-size: 14px;">${
          bracket.description || ''
        }</span>
        <div style="margin-top: 8px; font-weight: 600; font-size: 14px;">${priceText}</div>
      </div>
    `;

    label.querySelector('input').addEventListener('change', () => {
      this.state.selectedBracketId = bracket.id;
      this.render();
    });

    return label;
  }

  renderAddonsSection() {
    const section = document.createElement('div');
    section.className = 'configurator-group-box';

    if (this.data.addons.length === 0) {
      section.innerHTML =
        '<label class="grouping-title">Add-ons</label><p class="text-subdued"><em>No add-ons available.</em></p>';
      return section;
    }

    section.innerHTML = '<label class="grouping-title">Add-ons</label>';

    this.data.addons.forEach((addon) => {
      const card = this.renderAddonCard(addon);
      section.appendChild(card);
    });

    return section;
  }

  renderAddonCard(addon) {
    // Initialize addons state if it doesn't exist
    if (!this.state.addons) {
      this.state.addons = {};
    }

    const quantity = this.state.addons[addon.id] || 0;

    const card = document.createElement('div');
    // Add selected class if quantity > 0
    card.className = `product-card margin-top-sm ${quantity > 0 ? 'selected' : ''}`;

    // Calculate total price based on quantity (if > 0, otherwise show unit price)
    const displayPrice = ((addon.price * (quantity > 0 ? quantity : 1)) / 100).toFixed(0);

    // New Structure: Image | Body (Title, Desc, Price, Actions)
    card.innerHTML = `
      <div class="product-card__image">
        ${
          addon.image
            ? `<img src="${addon.image}" alt="${addon.title}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">`
            : '<div style="width: 80px; height: 80px; background: #F3F4F6; border-radius: 8px;"></div>'
        }
      </div>
      <div class="product-card__body">
        <div class="product-card__title">${addon.title}</div>
        <div class="product-card__desc">${addon.description || ''}</div>
        <div class="product-card__price">${displayPrice} €</div>
        
        <div class="product-card__actions">
        ${
          quantity === 0
            ? `<button class="btn-add-addon" data-addon-id="${addon.id}">Add</button>`
            : `<div class="qty-control-group">
            <button class="qty-btn qty-minus" data-addon-id="${addon.id}">−</button>
            <span class="qty-value">${quantity}</span>
            <button class="qty-btn qty-plus" data-addon-id="${addon.id}">+</button>
          </div>`
        }
        </div>
      </div>
    `;

    // Event listeners for addon quantity
    // Note: Selector classes updated to match new HTML
    const addBtn = card.querySelector('.btn-add-addon');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (!this.state.addons) this.state.addons = {};
        this.state.addons[addon.id] = 1;
        this.render();
      });
    }

    const minusBtn = card.querySelector('.qty-minus');
    if (minusBtn) {
      minusBtn.addEventListener('click', () => {
        if (this.state.addons[addon.id] > 0) {
          this.state.addons[addon.id]--;
          if (this.state.addons[addon.id] === 0) {
            delete this.state.addons[addon.id];
          }
          this.render();
        }
      });
    }

    const plusBtn = card.querySelector('.qty-plus');
    if (plusBtn) {
      plusBtn.addEventListener('click', () => {
        this.state.addons[addon.id]++;
        this.render();
      });
    }

    return card;
  }

  calculateTotals() {
    let screensTotal = 0;
    let oldScreensTotal = 0;
    this.state.screens.forEach((s) => {
      const rawCost = window.ScreenluxEngine.calculateScreenPrice(s, this.data.config);
      const variant = window.ScreenluxEngine.matchVariant(rawCost, this.data.screens);
      if (variant) {
        screensTotal += variant.price;
        oldScreensTotal += variant.compare_at_price || variant.price;
      }
    });

    let installTotal = 0;
    if (this.state.installationType === 'diy') {
      if (this.state.selectedBracketId && this.state.selectedBracketId !== 'unsure') {
        const b = this.data.brackets.find((x) => x.id == this.state.selectedBracketId);
        if (b) {
          installTotal = b.price * this.state.screens.length;
        }
      }
    } else if (this.state.installationType === 'professional') {
      const hasWired = this.state.screens.some((s) => s.motor !== 'solar');
      const targetLabel = hasWired ? 'Wired' : 'Solar';
      const svc = this.data.services.find((s) => s.title.includes(targetLabel));
      if (svc) installTotal += svc.price;
    }

    let addonsTotal = 0;
    Object.entries(this.state.addons).forEach(([id, qty]) => {
      const product = this.data.addons.find((p) => p.id == id);
      if (product) addonsTotal += product.price * qty;
    });

    const grandTotal = screensTotal + installTotal + addonsTotal;
    const oldGrandTotal = oldScreensTotal + installTotal + addonsTotal;
    return { screensTotal, oldScreensTotal, installTotal, addonsTotal, grandTotal, oldGrandTotal };
  }

  renderOrderSummary() {
    const totals = this.calculateTotals();
    const fmt = (cents) => `€${(cents / 100).toFixed(2)}`;

    const section = document.createElement('div');
    section.className = 'order-summary-box margin-top-lg';
    section.innerHTML = `<label class="grouping-title">Order summary</label>`;

    const list = document.createElement('div');
    list.className = 'summary-list';

    // 1. Screens Category (Grouped)
    const screensCategory = document.createElement('div');
    screensCategory.className = `summary-category ${this.state.screensExpanded ? 'expanded' : ''}`;

    const screenCount = this.state.screens.length;
    const screensHeader = document.createElement('div');
    screensHeader.className = 'summary-row category-header';
    screensHeader.innerHTML = `
      <div class="category-title">
        <span>Zip-Screens (${screenCount})</span>
        <svg class="chevron-icon" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <span class="category-price">${fmt(totals.screensTotal)}</span>
    `;
    screensHeader.onclick = () => {
      this.state.screensExpanded = !this.state.screensExpanded;
      this.render();
    };
    screensCategory.appendChild(screensHeader);

    if (this.state.screensExpanded) {
      const screensDetails = document.createElement('div');
      screensDetails.className = 'category-details';
      this.state.screens.forEach((s, i) => {
        const rawCost = window.ScreenluxEngine.calculateScreenPrice(s, this.data.config);
        const variant = window.ScreenluxEngine.matchVariant(rawCost, this.data.screens);
        const sPrice = variant ? variant.price : 0;
        const detailRow = document.createElement('div');
        detailRow.className = 'summary-row detail-row';
        detailRow.innerHTML = `
          <span class="detail-label">1x Zip Screen ${s.width}×${s.height}mm</span>
          <span class="detail-price">${fmt(sPrice)}</span>
        `;
        screensDetails.appendChild(detailRow);
      });
      screensCategory.appendChild(screensDetails);
    }
    list.appendChild(screensCategory);

    // 2. Add-ons Category
    const addonsCount = Object.values(this.state.addons).reduce((a, b) => a + b, 0);
    if (addonsCount > 0) {
      const addonsCategory = document.createElement('div');
      addonsCategory.className = `summary-category ${this.state.addonsExpanded ? 'expanded' : ''}`;

      const addonsHeader = document.createElement('div');
      addonsHeader.className = 'summary-row category-header';
      addonsHeader.innerHTML = `
        <div class="category-title">
          <span>Add-ons (${addonsCount})</span>
          <svg class="chevron-icon" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <span class="category-price">${fmt(totals.addonsTotal)}</span>
      `;
      addonsHeader.onclick = () => {
        this.state.addonsExpanded = !this.state.addonsExpanded;
        this.render();
      };
      addonsCategory.appendChild(addonsHeader);

      if (this.state.addonsExpanded) {
        const addonsDetails = document.createElement('div');
        addonsDetails.className = 'category-details';
        Object.entries(this.state.addons).forEach(([id, qty]) => {
          const product = this.data.addons.find((p) => p.id == id);
          if (product) {
            const pPrice = product.price * qty;
            const detailRow = document.createElement('div');
            detailRow.className = 'summary-row detail-row';
            detailRow.innerHTML = `
              <span class="detail-label">${qty}x ${product.title}</span>
              <span class="detail-price">${fmt(pPrice)}</span>
            `;
            addonsDetails.appendChild(detailRow);
          }
        });
        addonsCategory.appendChild(addonsDetails);
      }
      list.appendChild(addonsCategory);
    }

    // 3. Installation Category
    if (totals.installTotal > 0 || this.state.installationType === 'professional') {
      let installCount = 0;
      if (this.state.installationType === 'professional') {
        installCount = 1;
      }

      const installCategory = document.createElement('div');
      installCategory.className = `summary-category ${this.state.installationExpanded ? 'expanded' : ''}`;
      const label = 'Professional Installation';

      const installHeader = document.createElement('div');
      installHeader.className = 'summary-row category-header';
      installHeader.innerHTML = `
        <div class="category-title">
          <span>${label} (${installCount})</span>
          <svg class="chevron-icon" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <span class="category-price">${fmt(totals.installTotal)}</span>
      `;
      installHeader.onclick = () => {
        this.state.installationExpanded = !this.state.installationExpanded;
        this.render();
      };
      installCategory.appendChild(installHeader);

      if (this.state.installationExpanded) {
        const installDetails = document.createElement('div');
        installDetails.className = 'category-details';

        if (this.state.installationType === 'professional') {
          const hasWired = this.state.screens.some((s) => s.motor !== 'solar');
          const targetLabel = hasWired ? 'Wired' : 'Solar';
          const svc = this.data.services.find((s) => s.title.includes(targetLabel));
          if (svc) {
            const detailRow = document.createElement('div');
            detailRow.className = 'summary-row detail-row';
            detailRow.innerHTML = `
              <span class="detail-label">1x ${svc.title}</span>
              <span class="detail-price">${fmt(svc.price)}</span>
            `;
            installDetails.appendChild(detailRow);
          }
        }
        installCategory.appendChild(installDetails);
      }
      list.appendChild(installCategory);
    }

    // 4. Total
    const totalRow = document.createElement('div');
    totalRow.className = 'summary-row total';
    totalRow.innerHTML = `
      <span>Total</span>
      <div class="total-price-wrapper">
         ${totals.oldGrandTotal > totals.grandTotal ? `<span class="price-old">${fmt(totals.oldGrandTotal)}</span>` : ''} 
         <span class="price-current">${fmt(totals.grandTotal)}</span>
      </div>
    `;
    list.appendChild(totalRow);

    section.appendChild(list);

    // 5. Shipping Info
    const shippingInfo = document.createElement('div');
    shippingInfo.className = 'shipping-info-row';
    shippingInfo.innerHTML = `
      <span class="shipping-icon">
        <img src="${this.data.assets.truck_icon}" alt="Delivery" width="24" height="24">
      </span>
      <span class="shipping-text"><strong class="text-success">Free delivery</strong> · Arrives in 5-7 business days</span>
    `;
    section.appendChild(shippingInfo);

    // 6. Checkout Button
    const allValid = this.state.screens.every((s) => s.valid);
    const cartBtn = document.createElement('button');
    cartBtn.className = `btn btn-primary margin-top-md ${!allValid ? 'btn-disabled' : ''}`;
    cartBtn.innerText = allValid ? 'Continue to payment' : 'Please check dimensions';
    cartBtn.onclick = allValid ? this.handleAddToCart : null;

    section.appendChild(cartBtn);

    // 7. Designed in Germany Badge (Removed from inside Summary)
    // if (this.data.assets && this.data.assets.german_badge) { ... }

    return section;
  }

  renderAwardSection() {
    if (!this.data.assets || !this.data.assets.german_badge) return document.createElement('div');

    const section = document.createElement('div');
    section.className = 'margin-top-lg';
    section.style.display = 'flex';
    section.style.flexDirection = 'column';
    section.style.gap = '16px';
    section.style.alignItems = 'flex-start';

    // Layout: Image above Text
    // No background, image first
    section.innerHTML = `
      <img src="${this.data.assets.german_badge}" alt="German Design Award Winner 2026" style="width: 100px; height: auto; object-fit: contain; margin-bottom: 8px;">
      <div style="display: flex; flex-direction: column; gap: 8px;">
         <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #1F2937; line-height: 1.2;">
           Excellent Product Design 2026 Winner!
         </h4>
         <div style="font-size: 14px; color: #4B5563; line-height: 1.5;">
           <p style="margin: 0;">
             Die stilsichere Kombination aus schlankem Gehäuse und smarter Technologie schafft einen ästhetisch anspruchsvollen Sonnenschutz, der sich harmonisch in moderne Umgebungen einfügt. Mit dieser charakterstarken Lösung setzt das Projekt einen beeindrauckenden Maßstab für hochwertiges Outdoor-Design auf Gold-Niveau.
           </p>
         </div>
      </div>
    `;

    return section;
  }

  handleAddToCart = () => {
    const payload = window.ScreenluxEngine.generateCartPayload(this.state, this.data);
    const cartUrlInput = this.querySelector('input[name="cart-add-url"]');
    const cartUrl = cartUrlInput ? cartUrlInput.value : '/cart/add';

    console.log('Adding to cart:', payload);

    fetch(cartUrl + '.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((data) => {
        window.location.href = '/cart';
      })
      .catch((err) => {
        console.error('Cart Error:', err);
        // Fallback for simulation
      });
  };
}

if (!customElements.get('product-configurator')) {
  customElements.define('product-configurator', ProductConfigurator);
}
