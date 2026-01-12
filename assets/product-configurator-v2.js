console.log('🚀 Product Configurator Script Executing...');

class ProductConfigurator extends HTMLElement {
  constructor() {
    super();
    this.state = {
      screens: [], // Array of screen objects
      installationType: 'diy',
      addons: {}, // { prodId: qty }
      bracketId: null, // selected bracket variant ID
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
      frameColor: 'anthracite',
      fabricColor: 'charcoal',
      fabricType: '4-percent',
      cassetteSize: 'slim',
      motor: 'solar',
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

    // 1. Screens List
    const screensContainer = document.createElement('div');
    screensContainer.className = 'screens-list';

    this.state.screens.forEach((screen, index) => {
      screensContainer.appendChild(this.renderScreenItem(screen, index));
    });
    container.appendChild(screensContainer);

    // 2. Add Screen Button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-dashed margin-top-sm';
    addBtn.innerHTML = `<span>+</span> Add another one`;
    addBtn.onclick = this.handleAddScreen;
    container.appendChild(addBtn);

    // 3. Global Solar Check (Upsell)
    if (this.state.screens.some((s) => s.motor !== 'solar')) {
      const solarTip = document.createElement('div');
      solarTip.className = 'info-box margin-top-md';
      solarTip.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
             <span><strong>Go Solar?</strong> Save on wiring costs and install faster.</span>
             <button class="btn btn-text" style="color:var(--sl-color-primary);">Switch all to Solar</button>
        </div>
      `;
      solarTip.querySelector('button').onclick = this.handleGlobalSolar;
      container.appendChild(solarTip);
    }

    // 4. Installation Section
    container.appendChild(this.renderInstallationSection());

    // 5. Add-ons Section
    container.appendChild(this.renderAddonsSection());

    // 6. Order Summary & Cart
    container.appendChild(this.renderOrderSummary());

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
             screen.frameColor || 'anthracite',
             index,
             'color',
             'horizontal'
           )}

           <!-- Fabric Color Selector -->
           ${this.renderSelectionGrid(
             'Fabric color',
             'fabricColor',
             fabricColors,
             screen.fabricColor || 'charcoal',
             index,
             'color',
             'horizontal'
           )}
           
           <!-- Fabric Type Selector -->
           ${this.renderSelectionGrid(
             'Fabric transparency',
             'fabricType',
             fabricTypes,
             screen.fabricType || '4-percent',
             index,
             'image',
             'vertical'
           )}

           <!-- Cassette Size Selector -->
           ${this.renderSelectionGrid(
             'Cassette size',
             'cassetteSize',
             cassetteSizes,
             screen.cassetteSize || 'slim',
             index,
             'image',
             'vertical'
           )}

           <!-- Motor Selector -->
           ${this.renderSelectionGrid(
             'Motor',
             'motor',
             motorOptions,
             screen.motor || 'solar',
             index,
             'image',
             'vertical'
           )}
           
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
    section.innerHTML = `<h3>Add-ons</h3>`;

    if (this.data.addons.length === 0) {
      section.innerHTML += `<p class="text-subdued"><em>No add-ons available.</em></p>`;
      return section;
    }

    this.data.addons.forEach((addon) => {
      const row = document.createElement('div');
      row.className = 'addon-row';
      row.innerHTML = `<span>${addon.title} (€${addon.price / 100})</span>`;

      const qtySelector = document.createElement('hybrid-quantity-selector');
      qtySelector.innerHTML = `
         <button class="btn btn-secondary" style="min-width:60px; height:32px; padding:0;">Add</button>
         <div class="qty-controls hidden" style="display:flex; gap:8px; align-items:center;">
           <button class="qty-minus btn btn-secondary" style="width:32px; height:32px; padding:0;">-</button>
           <input type="number" readonly value="${
             this.state.addons[addon.id] || 0
           }" style="width:40px; text-align:center; border:none;">
           <button class="qty-plus btn btn-secondary" style="width:32px; height:32px; padding:0;">+</button>
         </div>
       `;

      qtySelector.addEventListener('change', (e) => {
        const val = parseInt(e.target.querySelector('input').value);
        this.updateAddon(addon.id, val);
      });

      row.appendChild(qtySelector);
      section.appendChild(row);
    });

    return section;
  }

  calculateTotals() {
    let screensTotal = 0;
    this.state.screens.forEach((s) => {
      screensTotal += window.ScreenluxEngine.calculateScreenPrice(s, this.data.config);
    });

    let installTotal = 0;
    if (this.state.installationType === 'diy' && this.state.bracketId) {
      const b = this.data.brackets.find((x) => x.id == this.state.bracketId);
      if (b) installTotal += b.price * this.state.screens.length;
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
      addonsCategory.className = 'summary-category';
      addonsCategory.innerHTML = `
        <div class="summary-row category-header no-chevron">
          <span>Add-ons (${addonsCount})</span>
          <span>${fmt(totals.addonsTotal)}</span>
        </div>
      `;
      list.appendChild(addonsCategory);
    }

    // 3. Installation Category
    if (totals.installTotal > 0 || this.state.installationType === 'professional') {
      const installCategory = document.createElement('div');
      installCategory.className = 'summary-category';
      const label = this.state.installationType === 'diy' ? 'Installation (DIY)' : 'Professional Installation';
      installCategory.innerHTML = `
        <div class="summary-row category-header no-chevron">
          <span>${label}</span>
          <span>${fmt(totals.installTotal)}</span>
        </div>
      `;
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
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M1 5H13V14H1M13 8H16L19 11V14H13V8ZM4 14C4 15.1046 3.10457 16 2 16C0.89543 16 0 15.1046 0 14C0 12.8954 0.89543 12 2 12C3.10457 12 4 12.8954 4 14ZM18 14C18 15.1046 17.1046 16 16 16C14.8954 16 14 15.1046 14 14C14 12.8954 14.8954 12 16 12C17.1046 12 18 12.8954 18 14Z" stroke="#10B981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
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
