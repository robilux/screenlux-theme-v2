class ProductConfigurator extends HTMLElement {
  constructor() {
    super();
    this.state = {
      screens: [], // Array of screen objects
      installationType: 'diy',
      addons: {}, // { prodId: qty }
      bracketId: null, // selected bracket variant ID
    };

    // Bind methods
    this.handleAddScreen = this.handleAddScreen.bind(this);
    this.handleGlobalSolar = this.handleGlobalSolar.bind(this);
    this.handleAddToCart = this.handleAddToCart.bind(this);

    // Initialize
    this.init();
  }

  init() {
    // 1. Load Data
    this.data = window.ScreenluxData;
    if (!this.data) {
      this.innerHTML = '<div class="error">Error loading configuration data.</div>';
      return;
    }

    // 2. Initial State: 1 Screen
    this.addScreen();
    this.render();
  }

  /* --- State Modifiers --- */

  addScreen() {
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
    });

    // Collapse others
    this.state.screens.forEach((s) => {
      if (s.id !== newId) s.expanded = false;
    });

    this.render();
  }

  updateScreen(index, field, value) {
    const screen = this.state.screens[index];

    // Type conversion for numbers
    if (field === 'width' || field === 'height') {
      value = parseInt(value) || 0;
    }

    screen[field] = value;
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

  handleGlobalSolar() {
    this.state.screens.forEach((s) => (s.solar = true));
    this.render();
  }

  updateAddon(id, qty) {
    this.state.addons[id] = qty;
    this.render(); // Re-render summary
  }

  /* --- Rendering --- */

  render() {
    // Clear current DOM (Simple re-render strategy for vanilla)
    this.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'configurator-app';

    // 1. Screens List
    const screensContainer = document.createElement('div');
    screensContainer.className = 'screens-list section-spacing';

    this.state.screens.forEach((screen, index) => {
      screensContainer.appendChild(this.renderScreenItem(screen, index));
    });
    container.appendChild(screensContainer);

    // 2. Add Screen Button
    const addBtn = document.createElement('button');
    addBtn.className = 'button button--secondary full-width margin-top';
    addBtn.innerText = 'Add another screen';
    addBtn.onclick = this.handleAddScreen;
    container.appendChild(addBtn);

    // 3. Global Solar Check (Visual Logic)
    // Only show if ANY screen is NOT solar
    if (this.state.screens.some((s) => !s.solar)) {
      const solarTip = document.createElement('div');
      solarTip.className = 'solar-tip section-spacing';
      solarTip.innerHTML = `
        <div class="tip-box">
          <p><strong>Go Solar?</strong> Save on wiring costs.</p>
          <button class="button--link">Switch all to Solar</button>
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

    this.appendChild(container);
  }

  renderScreenItem(screen, index) {
    const wrapper = document.createElement('details-accordion');
    // Using string templates for simplicity in this artifact
    const price = window.ScreenluxEngine.calculateScreenPrice(screen, this.data.config);
    const nicePrice = (price / 100).toFixed(2);

    wrapper.innerHTML = `
      <details ${screen.expanded ? 'open' : ''}>
        <summary>
          <span>Screen ${index + 1} (${screen.width}x${screen.height})</span>
          <span>€${nicePrice}</span>
        </summary>
        <div class="accordion__content form-grid">
           <!-- Dimensions -->
           <div class="field">
             <label>Width (mm)</label>
             <input type="number" value="${screen.width}" data-field="width">
           </div>
           <div class="field">
             <label>Height (mm)</label>
             <input type="number" value="${screen.height}" data-field="height">
           </div>
           
           <!-- Toggles -->
           <div class="field-checkbox">
              <label>
                <input type="checkbox" ${screen.solar ? 'checked' : ''} data-field="solar">
                Solar Powered (+€100)
              </label>
           </div>
        </div>
      </details>
    `;

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
      // Timeout to allow the native toggle to happen, then correct state
      setTimeout(() => this.toggleScreenAccordion(index), 0);
    });

    return wrapper;
  }

  renderInstallationSection() {
    const section = document.createElement('div');
    section.className = 'section-spacing';
    section.innerHTML = `<h3>Installation</h3>`;

    // Type Switcher
    const switcher = document.createElement('div');
    switcher.className = 'install-switch';
    switcher.innerHTML = `
      <label><input type="radio" name="install" value="diy" ${
        this.state.installationType === 'diy' ? 'checked' : ''
      }> DIY</label>
      <label><input type="radio" name="install" value="professional" ${
        this.state.installationType === 'professional' ? 'checked' : ''
      }> Professional</label>
    `;

    switcher.querySelectorAll('input').forEach((radio) => {
      radio.addEventListener('change', (e) => this.setInstallationType(e.target.value));
    });
    section.appendChild(switcher);

    // DIY Brackets
    if (this.state.installationType === 'diy') {
      const bracketsList = document.createElement('div');
      bracketsList.innerHTML = `<h4>Select Brackets</h4>`;
      this.data.brackets.forEach((b) => {
        const row = document.createElement('div');
        row.innerHTML = `<label><input type="radio" name="bracket" value="${b.id}" ${
          this.state.bracketId == b.id ? 'checked' : ''
        }> ${b.title} (+€${b.price / 100})</label>`;
        row.querySelector('input').addEventListener('change', () => {
          this.state.bracketId = b.id;
        });
        bracketsList.appendChild(row);
      });
      section.appendChild(bracketsList);
    }

    return section;
  }

  renderAddonsSection() {
    const section = document.createElement('div');
    section.className = 'section-spacing';
    section.innerHTML = `<h3>Add-ons</h3>`;

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

  renderOrderSummary() {
    const section = document.createElement('div');
    section.className = 'section-spacing summary-box';
    section.innerHTML = `<h3>Order Summary</h3>`;

    // Calculate Breakdown
    // ... (Aggregation logic similar to generateCartPayload but for display) ...
    // For brevity, just a total count
    section.innerHTML += `<p>Screens: ${this.state.screens.length}</p>`;

    const cartBtn = document.createElement('button');
    cartBtn.className = 'button button--primary full-width';
    cartBtn.innerText = 'Add to Cart';
    cartBtn.onclick = this.handleAddToCart;

    section.appendChild(cartBtn);
    return section;
  }

  /* --- Actions --- */

  handleAddToCart() {
    const payload = window.ScreenluxEngine.generateCartPayload(this.state, this.data);
    const cartUrl = this.querySelector('input[name="cart-add-url"]').value;

    fetch(cartUrl + '.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((data) => {
        alert('Added to cart!');
        // Optional: Redirect to cart or open drawer
        window.location.href = '/cart';
      })
      .catch((err) => console.error('Cart Error:', err));
  }
}

customElements.define('product-configurator', ProductConfigurator);
