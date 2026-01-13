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

      // 2. Initial State: 1 Screen
      this.handleAddScreen();

      // 3. Initial Render
      this.render();
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

  handleAddScreen = () => {
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

    this.render();
  }

  removeScreen(index) {
    if (this.state.screens.length <= 1) return;
    this.state.screens.splice(index, 1);
    this.render();
  }

  toggleScreenAccordion(index) {
    this.state.screens.forEach((s, i) => {
      s.expanded = i === index ? !s.expanded : false;
    });
    this.render();
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

    // Create Main Group Container
    const mainGroup = document.createElement('div');
    mainGroup.className = 'configurator-main-group';

    // 1. Screens List
    const screensContainer = document.createElement('div');
    screensContainer.className = 'screens-list';

    // Add Header for Screens Section
    screensContainer.innerHTML = '<label class="field-label">Configure your screens</label>';

    this.state.screens.forEach((screen, index) => {
      screensContainer.appendChild(this.renderScreenItem(screen, index));
    });
    mainGroup.appendChild(screensContainer);

    // 2. Add Screen Button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-dashed margin-top-sm';
    addBtn.innerHTML = `<span>+</span> Add another one`;
    addBtn.onclick = this.handleAddScreen;
    mainGroup.appendChild(addBtn);

    // 3. Global Solar Check (Upsell)
    if (this.state.screens.some((s) => s.motor !== 'solar')) {
      const solarTip = document.createElement('div');
      solarTip.className = 'info-box';
      solarTip.innerHTML = `
        <div class="info-box__header">
          <strong>TIP:</strong> Switch to <strong>Solar Driven</strong> screens simplify installation and reduces installation costs.
        </div>
        <ul class="info-box__benefits">
          <li class="info-box__benefit">No wiring</li>
          <li class="info-box__benefit">No wall drilling for power</li>
          <li class="info-box__benefit">No electrician dependency</li>
        </ul>
        <div class="info-box__footer">
          Switch now and save <strong>1200€</strong> on professional assembly.
        </div>
        <button class="info-box__button">Switch to Solar</button>
      `;
      solarTip.querySelector('button').onclick = this.handleGlobalSolar;
      mainGroup.appendChild(solarTip);
    }

    // 4. Installation Section
    mainGroup.appendChild(this.renderInstallationSection());

    // 5. Add-ons Section
    mainGroup.appendChild(this.renderAddonsSection());

    // Append Main Group to Container
    container.appendChild(mainGroup);

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
    const price = window.ScreenluxEngine.calculateScreenPrice(screen, this.data.config);
    const nicePrice = (price / 100).toFixed(2);

    const frameOptions = this.data.frameColors || [];
    const fabricColors = this.data.fabricColors || [];
    const fabricTypes = this.data.fabrics || [];
    const cassetteSizes = this.data.cassetteSizes || [];
    const motorOptions = this.data.motorOptions || [];

    wrapper.innerHTML = `
      <details ${screen.expanded ? 'open' : ''} class="${screen.valid ? '' : 'invalid'}">
        <summary>
          <div class="summary-content">
             <span class="summary-status ${screen.valid ? 'valid' : 'invalid'}"></span>
             <span>Screen ${index + 1}</span>
          </div>
          <div class="summary-meta">
             ${screen.width} x ${screen.height} mm · ${screen.frameColor || 'Anthracite'} · €${nicePrice}
          </div>
        </summary>
        <div class="accordion-body">
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
           
           <!-- Frame Color Selector -->
           ${this.renderSelectionGrid(
             'Frame color',
             'frameColor',
             frameOptions,
             screen.frameColor,
             index,
             'color',
             'horizontal'
           )}

           <!-- Fabric Color Selector -->
           ${this.renderSelectionGrid(
             'Fabric color',
             'fabricColor',
             fabricColors,
             screen.fabricColor,
             index,
             'color',
             'horizontal'
           )}
           
           <!-- Fabric Type Selector -->
           ${this.renderSelectionGrid(
             'Fabric transparency',
             'fabricType',
             fabricTypes,
             screen.fabricType,
             index,
             'image',
             'vertical'
           )}

           <!-- Cassette Size Selector -->
           ${this.renderSelectionGrid(
             'Cassette size',
             'cassetteSize',
             cassetteSizes,
             screen.cassetteSize,
             index,
             'image',
             'vertical'
           )}

           <!-- Motor Selector -->
           ${this.renderSelectionGrid('Motor', 'motor', motorOptions, screen.motor, index, 'image', 'vertical')}
           
           <!-- Actions -->
           <div class="margin-top-md" style="display:flex; justify-content: space-between; align-items: center;">
              <button type="button" class="btn btn-text remove-screen-btn" style="color:var(--sl-color-error); padding:0; width:auto;">
                🗑️ Remove screen
              </button>
              <button type="button" class="btn btn-text duplicate-screen-btn" style="padding:0; width:auto; color: var(--sl-text-secondary);">
                📄 Duplicate screen
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
        if (confirm('Remove this screen?')) this.removeScreen(index);
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
    section.className = 'margin-top-lg';

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
    const html = `
      <div class="field margin-top-md">
        <label class="field-label">Installation</label>
        <div class="selection-grid--vertical">
          ${installationOptions
            .map((opt) => {
              const isSelected = this.state.installationType === opt.id;
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
                  <span class="card-price" style="font-weight: 600; margin-top: 8px; display: block;">${
                    opt.price
                  }</span>
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

    section.innerHTML = html;

    // Add event listeners for installation type
    section.querySelectorAll('input[name="installationType"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        this.setInstallationType(e.target.value);
      });
    });

    // DIY Brackets Section
    if (this.state.installationType === 'diy') {
      const bracketsSection = document.createElement('div');
      bracketsSection.className = 'margin-top-lg';
      bracketsSection.innerHTML = '<label class="field-label">Installation brackets</label>';

      if (this.data.brackets.length === 0) {
        bracketsSection.innerHTML += `<p class="text-subdued margin-top-sm"><em>No brackets found.</em></p>`;
      } else {
        this.data.brackets.forEach((bracket) => {
          const card = this.renderBracketCard(bracket);
          bracketsSection.appendChild(card);
        });
      }

      section.appendChild(bracketsSection);
    }

    return section;
  }

  renderBracketCard(bracket) {
    const card = document.createElement('div');
    card.className = 'product-card margin-top-sm';

    // Initialize brackets state if it doesn't exist
    if (!this.state.brackets) {
      this.state.brackets = {};
    }

    const quantity = this.state.brackets[bracket.id] || 0;
    const price = (bracket.price / 100).toFixed(0);

    card.innerHTML = `
      <div class="product-card__image">
        ${
          bracket.image
            ? `<img src="${bracket.image}" alt="${bracket.title}" style="width: 64px; height: 64px; object-fit: cover; border-radius: 8px;">`
            : '<div style="width: 64px; height: 64px; background: #F3F4F6; border-radius: 8px;"></div>'
        }
      </div>
      <div class="product-card__content">
        <div class="product-card__title">${bracket.title}</div>
        <div class="product-card__desc">${bracket.description || ''}</div>
        <div class="product-card__price">${price} €</div>
      </div>
      <div class="product-card__actions">
        ${
          quantity === 0
            ? `<button class="btn btn-secondary add-bracket-btn" data-bracket-id="${bracket.id}">Add</button>`
            : `<div class="qty-controls" style="display: flex; gap: 8px; align-items: center;">
            <button class="btn btn-secondary qty-minus" data-bracket-id="${bracket.id}" style="width: 32px; height: 32px; padding: 0;">−</button>
            <span style="min-width: 24px; text-align: center; font-weight: 500;">${quantity}</span>
            <button class="btn btn-secondary qty-plus" data-bracket-id="${bracket.id}" style="width: 32px; height: 32px; padding: 0;">+</button>
          </div>`
        }
      </div>
    `;

    // Event listeners for bracket quantity
    const addBtn = card.querySelector('.add-bracket-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (!this.state.brackets) this.state.brackets = {};
        this.state.brackets[bracket.id] = 1;
        this.render();
      });
    }

    const minusBtn = card.querySelector('.qty-minus');
    if (minusBtn) {
      minusBtn.addEventListener('click', () => {
        if (this.state.brackets[bracket.id] > 0) {
          this.state.brackets[bracket.id]--;
          if (this.state.brackets[bracket.id] === 0) {
            delete this.state.brackets[bracket.id];
          }
          this.render();
        }
      });
    }

    const plusBtn = card.querySelector('.qty-plus');
    if (plusBtn) {
      plusBtn.addEventListener('click', () => {
        this.state.brackets[bracket.id]++;
        this.render();
      });
    }

    return card;
  }

  renderAddonsSection() {
    const section = document.createElement('div');
    section.className = 'margin-top-lg';

    if (this.data.addons.length === 0) {
      section.innerHTML =
        '<label class="field-label">Add-ons</label><p class="text-subdued"><em>No add-ons available.</em></p>';
      return section;
    }

    section.innerHTML = '<label class="field-label">Add-ons</label>';

    this.data.addons.forEach((addon) => {
      const card = this.renderAddonCard(addon);
      section.appendChild(card);
    });

    return section;
  }

  renderAddonCard(addon) {
    const card = document.createElement('div');
    card.className = 'product-card margin-top-sm';

    // Initialize addons state if it doesn't exist
    if (!this.state.addons) {
      this.state.addons = {};
    }

    const quantity = this.state.addons[addon.id] || 0;
    const price = (addon.price / 100).toFixed(0);

    card.innerHTML = `
      <div class="product-card__image">
        ${
          addon.image
            ? `<img src="${addon.image}" alt="${addon.title}" style="width: 64px; height: 64px; object-fit: cover; border-radius: 8px;">`
            : '<div style="width: 64px; height: 64px; background: #F3F4F6; border-radius: 8px;"></div>'
        }
      </div>
      <div class="product-card__content">
        <div class="product-card__title">${addon.title}</div>
        <div class="product-card__desc">${addon.description || ''}</div>
        <div class="product-card__price">${price} €</div>
      </div>
      <div class="product-card__actions">
        ${
          quantity === 0
            ? `<button class="btn btn-secondary add-addon-btn" data-addon-id="${addon.id}">Add</button>`
            : `<div class="qty-controls" style="display: flex; gap: 8px; align-items: center;">
            <button class="btn btn-secondary qty-minus" data-addon-id="${addon.id}" style="width: 32px; height: 32px; padding: 0;">−</button>
            <span style="min-width: 24px; text-align: center; font-weight: 500;">${quantity}</span>
            <button class="btn btn-secondary qty-plus" data-addon-id="${addon.id}" style="width: 32px; height: 32px; padding: 0;">+</button>
          </div>`
        }
      </div>
    `;

    // Event listeners for addon quantity
    const addBtn = card.querySelector('.add-addon-btn');
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
    this.state.screens.forEach((s) => {
      screensTotal += window.ScreenluxEngine.calculateScreenPrice(s, this.data.config);
    });

    let installTotal = 0;
    if (this.state.installationType === 'diy') {
      if (this.state.brackets) {
        Object.entries(this.state.brackets).forEach(([id, qty]) => {
          const b = this.data.brackets.find((x) => x.id == id);
          if (b) installTotal += b.price * qty;
        });
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

    return { screensTotal, installTotal, addonsTotal, grandTotal: screensTotal + installTotal + addonsTotal };
  }

  renderOrderSummary() {
    const totals = this.calculateTotals();
    const fmt = (cents) => `€${(cents / 100).toFixed(2)}`;

    const section = document.createElement('div');
    section.className = 'order-summary-box margin-top-lg animate-fade-in';
    section.innerHTML = `<h3 class="order-summary-title">Order Summary</h3>`;

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
        const sPrice = window.ScreenluxEngine.calculateScreenPrice(s, this.data.config);
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
      if (this.state.installationType === 'professional') installCount = 1;
      else if (this.state.installationType === 'diy') {
        installCount = Object.values(this.state.brackets || {}).reduce((a, b) => a + b, 0);
      }

      const installCategory = document.createElement('div');
      installCategory.className = `summary-category ${this.state.installationExpanded ? 'expanded' : ''}`;
      const label = this.state.installationType === 'diy' ? 'Installation' : 'Professional Installation'; // "Installation" matches user image better for generic, but distinct is good too.

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
        } else {
          // DIY Brackets
          if (this.state.brackets) {
            Object.entries(this.state.brackets).forEach(([id, qty]) => {
              const bracket = this.data.brackets.find((b) => b.id == id);
              if (bracket) {
                const bPrice = bracket.price * qty;
                const detailRow = document.createElement('div');
                detailRow.className = 'summary-row detail-row';
                detailRow.innerHTML = `
                  <span class="detail-label">${qty}x ${bracket.title}</span>
                  <span class="detail-price">${fmt(bPrice)}</span>
                `;
                installDetails.appendChild(detailRow);
              }
            });
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
         <span class="price-old">${fmt(totals.grandTotal * 1.1)}</span> 
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
    section.className = 'order-summary-box margin-top-lg animate-fade-in'; // Reuse box style
    section.style.display = 'flex';
    section.style.flexDirection = 'column';
    section.style.gap = '16px';

    // Layout: Image + Text block
    // Based on user request to match Figma/Image
    section.innerHTML = `
      <div style="display: flex; gap: 20px; align-items: flex-start;">
         <div style="flex-shrink: 0;">
            <img src="${this.data.assets.german_badge}" alt="German Design Award Winner 2026" style="width: 100px; height: auto; object-fit: contain;">
         </div>
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
        alert('Items added to cart.');
        window.location.href = '/cart';
      })
      .catch((err) => {
        console.error('Cart Error:', err);
        // Fallback for simulation
        // alert('Simulated Add to Cart');
      });
  };
}

if (!customElements.get('product-configurator')) {
  customElements.define('product-configurator', ProductConfigurator);
}
