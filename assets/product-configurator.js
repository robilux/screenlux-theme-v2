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

    // Auto-bound methods via arrow functions below
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
      this.render(); // If render fails, it will catch below.
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
    // Basic validation could go here
    const newId = this.state.screens.length + 1;
    this.state.screens.push({
      id: newId,
      width: 1500,
      height: 1000,
      solar: false,
      cassette: 'standard',
      frameColor: 'Anthracite',
      fabricColor: 'Grey',
      expanded: true, // Auto-expand new screen
      valid: true,
      errors: {},
    });

    // Collapse others
    this.state.screens.forEach((s) => {
      if (s.id !== newId) s.expanded = false;
    });

    this.render();
  };

  // Other methods remain standard methods unless they are callbacks.
  // Standard methods are fine if not used as callbacks, or we can convert them for consistency.

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
    if (this.state.screens.length <= 1) return; // Prevent deleting last screen
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
    this.state.screens.forEach((s) => (s.solar = true));
    this.render();
  };

  updateAddon(id, qty) {
    this.state.addons[id] = qty;
    this.render(); // Re-render summary
  }

  /* --- Rendering --- */

  saveFocus() {
    const active = document.activeElement;
    if (!active || !this.contains(active)) return null;
    // Strategy: return a selector string or unique attributes
    if (active.dataset.field) {
      // It's a dimension input: which screen?
      const details = active.closest('details-accordion');
      // Find index of this details in the list... or simpler: use unique IDs in inputs if possible.
      // Current code doesn't have unique IDs for dimension inputs.
      // Let's use data-field + value + proximity to screen title?
      // Fallback: Store the path or just the value?
      // Let's rely on the order in the DOM.
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

    // Build off-DOM to prevent painting intermediate states
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
    addBtn.className = 'button button--secondary button--outline full-width margin-top';
    addBtn.innerText = 'Add another screen';
    addBtn.onclick = this.handleAddScreen;
    container.appendChild(addBtn);

    // 3. Global Solar Check
    if (this.state.screens.some((s) => !s.solar)) {
      const solarTip = document.createElement('div');
      solarTip.className = 'solar-tip section-spacing';
      solarTip.innerHTML = `
        <div class="tip-box info-box">
          <div style="display:flex; justify-content:space-between; align-items:center;">
             <span><strong>Go Solar?</strong> Save on wiring costs.</span>
             <button class="button--text">Switch all to Solar</button>
          </div>
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

  // New Helper: Render Visual Selection Grid
  renderSelectionGrid(label, fieldName, options, selectedValue, index, isColor = false) {
    let html = `<div class="field margin-top"><label>${label}</label><div class="selection-grid">`;

    options.forEach((opt) => {
      const isSelected = selectedValue === opt.id;
      // Visual: Color Circle or Image Card?
      let visual = '';
      if (opt.hex) {
        visual = `<span class="color-swatch" style="background:${opt.hex}; border: 1px solid #ddd;"></span>`;
      } else if (opt.image) {
        // Placeholder image if link is broken, or just style a box
        visual = `<div class="card-image" style="background-image: url('${opt.image}');"></div>`;
      }

      html += `
        <label class="selection-card ${isSelected ? 'selected' : ''}">
          <input type="radio" name="${fieldName}_${index}" value="${opt.id}" ${
        isSelected ? 'checked' : ''
      } class="hidden-input">
          <div class="card-content">
            ${visual}
            <div class="card-text">
                <span class="card-title">${opt.title}</span>
                ${opt.desc ? `<span class="card-desc">${opt.desc}</span>` : ''}
            </div>
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

    // Prepare HTML
    const frameOptions = this.data.frameColors || [];
    const fabricOptions = this.data.fabrics || [];

    wrapper.innerHTML = `
      <details ${screen.expanded ? 'open' : ''} class="${screen.valid ? '' : 'has-error'} animate-fade-in">
        <summary>
          <div class="summary-title">
             <span class="icon-status ${screen.valid ? 'valid' : 'invalid'}"></span>
             Screen ${index + 1}
          </div>
          <div class="summary-meta">
             <span class="dim-tag">${screen.width} x ${screen.height}</span>
             <span class="price-tag">€${nicePrice}</span>
          </div>
        </summary>
        <div class="accordion__content form-grid">
           <!-- Dimensions -->
           <div class="form-row"> 
             <div class="field">
               <label>Width (mm)</label>
               <input type="number" 
                      value="${screen.width}" 
                      data-field="width" 
                      class="${screen.errors.dimension && !screen.width ? 'error' : ''}">
             </div>
             <div class="field">
               <label>Height (mm)</label>
               <input type="number" 
                      value="${screen.height}" 
                      data-field="height"
                      class="${screen.errors.dimension && !screen.height ? 'error' : ''}">
             </div>
           </div>
           
           ${!screen.valid ? `<div class="error-msg">⚠️ ${screen.errors.dimension || 'Invalid dimensions'}</div>` : ''}
           
           <!-- Frame Color Selector -->
           ${this.renderSelectionGrid(
             'Frame Color',
             'frameColor',
             frameOptions,
             screen.frameColor || 'anthracite',
             index
           )}
           
           <!-- Fabric Selector -->
           ${this.renderSelectionGrid(
             'Fabric Transparency',
             'cassette',
             fabricOptions,
             screen.cassette || 'standard',
             index
           )}
           
           <!-- Toggles -->
           <div class="field-checkbox margin-top">
              <label>
                <input type="checkbox" ${screen.solar ? 'checked' : ''} data-field="solar">
                Solar Powered (+€100)
              </label>
           </div>
           
           <!-- Actions -->
            ${
              this.state.screens.length > 1
                ? `
              <div class="screen-actions margin-top">
                <button type="button" class="button--text text-danger remove-screen-btn">Remove Screen</button>
              </div>
            `
                : ''
            }
        </div>
      </details>
    `;

    // Remove Listener
    const removeBtn = wrapper.querySelector('.remove-screen-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Stop detail toggle
        e.stopPropagation();
        if (confirm('Remove this screen?')) this.removeScreen(index);
      });
    }

    // Event Delegation for inputs
    wrapper.querySelectorAll('input').forEach((input) => {
      input.addEventListener('change', (e) => {
        const field = e.target.dataset.field;
        const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        this.updateScreen(index, field, val);
      });
    });

    // Handle Summary Click manually to update 'expanded' state logic
    wrapper.querySelector('summary').addEventListener('click', () => {
      setTimeout(() => this.toggleScreenAccordion(index), 0);
    });

    return wrapper;
  }

  renderInstallationSection() {
    const section = document.createElement('div');
    section.className = 'section-spacing';
    section.innerHTML = `<h3>Installation</h3>`;

    // Type Switcher (Segmented Control)
    const switcher = document.createElement('div');
    switcher.className = 'segmented-control';
    switcher.innerHTML = `
      <label class="${this.state.installationType === 'diy' ? 'active' : ''}">
        <input type="radio" name="install" value="diy" class="hidden-input" ${
          this.state.installationType === 'diy' ? 'checked' : ''
        }> 
        <span>DIY</span>
      </label>
      <label class="${this.state.installationType === 'professional' ? 'active' : ''}">
        <input type="radio" name="install" value="professional" class="hidden-input" ${
          this.state.installationType === 'professional' ? 'checked' : ''
        }> 
        <span>Professional</span>
      </label>
    `;

    switcher.querySelectorAll('input').forEach((radio) => {
      radio.addEventListener('change', (e) => this.setInstallationType(e.target.value));
    });
    section.appendChild(switcher);

    // DIY Brackets
    if (this.state.installationType === 'diy') {
      if (this.data.brackets.length === 0) {
        const msg = document.createElement('div');
        msg.innerHTML = `<p class="text-subdued margin-top"><em>No brackets found. Create collection "installation-brackets".</em></p>`;
        section.appendChild(msg);
      } else {
        // Use the reused visual grid helper!
        // We need to map 'price' to a description or handle it
        // The helper expects {id, title, [hex|image], [desc]}
        // Our brackets have {id, title, image, price}
        // Let's create a temporary mapped array for display
        const displayOptions = this.data.brackets.map((b) => ({
          ...b,
          image: b.image || '', // Ensure property exists
          desc: `+€${(b.price / 100).toFixed(2)}`,
        }));

        section.innerHTML += this.renderSelectionGrid(
          'Select Brackets',
          'bracket',
          displayOptions,
          this.state.bracketId,
          0 // Index doesn't matter for global install
        );

        // Re-attach listeners because renderSelectionGrid returns string HTML
        // wait... section.innerHTML += string DESTROYS previous listeners on switcher!
        // CRITICAL FIX: We must append the grid as an element or re-attach switcher listeners.
        // Better strategy: Build the grid string first, then append innerHTML to a container?
        // No, renderSelectionGrid returns a string.
        // Let's preserve the switcher reference.
      }
    } else {
      // Professional Info
      const proInfo = document.createElement('div');
      proInfo.className = 'info-box margin-top';
      proInfo.innerHTML = `<p>Our experts will contact you to schedule an installation date.</p>`;
      section.appendChild(proInfo);
    }

    // Re-attach switcher listeners (safest approach after innerHTML manip)
    section.querySelectorAll('.segmented-control input').forEach((radio) => {
      radio.addEventListener('change', (e) => this.setInstallationType(e.target.value));
    });

    // Attach Bracket listeners
    if (this.state.installationType === 'diy') {
      section.querySelectorAll('input[name^="bracket_"]').forEach((input) => {
        input.addEventListener('change', (e) => {
          this.state.bracketId = parseInt(e.target.value);
          this.render(); // Re-render to update summary/selection state
        });
      });
    }

    return section;
  }

  renderAddonsSection() {
    const section = document.createElement('div');
    section.className = 'section-spacing';
    section.innerHTML = `<h3>Add-ons</h3>`;

    if (this.data.addons.length === 0) {
      section.innerHTML += `<p class="text-subdued"><em>No add-ons found. Create collection "add-ons".</em></p>`;
      return section;
    }

    this.data.addons.forEach((addon) => {
      const row = document.createElement('div');
      row.className = 'addon-row';
      row.innerHTML = `<span>${addon.title} (€${addon.price / 100})</span>`;

      const qtySelector = document.createElement('hybrid-quantity-selector');
      qtySelector.innerHTML = `
         <button class="btn-add button button--secondary">Add</button>
         <div class="qty-controls hidden">
           <button class="qty-minus">-</button>
           <input type="number" readonly value="${this.state.addons[addon.id] || 0}">
           <button class="qty-plus">+</button>
         </div>
       `;

      qtySelector.addEventListener('change', (e) => {
        // The hybrid selector updates the input value, we read it
        const val = parseInt(e.target.querySelector('input').value);
        this.updateAddon(addon.id, val);
      });

      row.appendChild(qtySelector);
      section.appendChild(row);
    });

    return section;
  }

  /**
   * Calculates current totals for display
   */
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
      // Find service price (Wired or Solar)
      const hasWired = this.state.screens.some((s) => !s.solar);
      const target = hasWired ? 'Wired' : 'Solar';
      const svc = this.data.services.find((s) => s.title.includes(target));
      if (svc) installTotal += svc.price; // Flat fee usually
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
    section.className = 'section-spacing summary-box';
    section.innerHTML = `<h3>Order Summary</h3>`;

    const summaryList = document.createElement('div');
    summaryList.className = 'summary-list';

    // Screens Line
    summaryList.innerHTML += `
      <div class="summary-row">
        <span>Screens (${this.state.screens.length})</span>
        <span>${fmt(totals.screensTotal)}</span>
      </div>
    `;

    // Installation Line
    if (totals.installTotal > 0) {
      let label =
        this.state.installationType === 'diy'
          ? `Brackets (${this.state.screens.length}x)`
          : 'Professional Installation';
      summaryList.innerHTML += `
        <div class="summary-row">
            <span>${label}</span>
            <span>${fmt(totals.installTotal)}</span>
        </div>
       `;
    }

    // Addons Line(s)
    if (totals.addonsTotal > 0) {
      summaryList.innerHTML += `
        <div class="summary-row">
            <span>Add-ons</span>
            <span>${fmt(totals.addonsTotal)}</span>
        </div>
       `;
    }

    // Grand Total
    summaryList.innerHTML += `
      <div class="summary-row summary-total margin-top">
        <span>Total</span>
        <span>${fmt(totals.grandTotal)}</span>
      </div>
    `;

    section.appendChild(summaryList);

    // Validate All before enabling
    const allValid = this.state.screens.every((s) => s.valid);

    const cartBtn = document.createElement('button');
    cartBtn.className = `button button--primary full-width margin-top ${!allValid ? 'disabled' : ''}`;
    cartBtn.innerText = allValid ? 'Add to Cart' : 'Fix Issues to Checkout';
    cartBtn.onclick = allValid ? this.handleAddToCart : null;
    if (!allValid) cartBtn.disabled = true;

    section.appendChild(cartBtn);
    return section;
  }

  /* --- Actions --- */

  handleAddToCart = () => {
    const payload = window.ScreenluxEngine.generateCartPayload(this.state, this.data);
    const cartUrlInput = this.querySelector('input[name="cart-add-url"]');
    // Fallback for independent testing
    const cartUrl = cartUrlInput ? cartUrlInput.value : '/cart/add';

    console.log('Adding to cart:', payload);

    fetch(cartUrl + '.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((data) => {
        alert('Added to cart!');
        window.location.href = '/cart';
      })
      .catch((err) => {
        console.error('Cart Error:', err);
        // For testing without Shopify
        if (cartUrl === '/cart/add') alert('Simulation: Added to cart (See console)');
      });
  };
}

// Global safe check (though customElement.define handles this usually)
if (!customElements.get('product-configurator')) {
  customElements.define('product-configurator', ProductConfigurator);
}
