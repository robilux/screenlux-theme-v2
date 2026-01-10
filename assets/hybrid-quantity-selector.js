class HybridQuantitySelector extends HTMLElement {
  constructor() {
    super();
    // Elements are not guaranteed to exist in constructor
  }

  connectedCallback() {
    // 1. Query Elements
    this.input = this.querySelector('input');
    this.addButton = this.querySelector('.btn-add');
    this.controls = this.querySelector('.qty-controls');
    this.minusBtn = this.querySelector('.qty-minus');
    this.plusBtn = this.querySelector('.qty-plus');

    if (!this.input || !this.addButton) return; // Safety check

    // 2. Clear old listeners (idempotency check simpler here: just re-add)
    // In a production app, we might check if already initialized, but for this simple element replacing innerHTML is rare.
    // To be safe, we'll assign 'onclick' handlers directly or use AbortController.
    // For simplicity/robustness here:

    this.addButton.onclick = () => this.activate();
    this.minusBtn.onclick = () => this.update(-1);
    this.plusBtn.onclick = () => this.update(1);

    // 3. Initial State Check
    if (this.input.value > 0) {
      this.showControls();
    }
  }

  activate() {
    this.input.value = 1;
    this.dispatchEvent(new Event('change', { bubbles: true }));
    this.showControls();
  }

  update(delta) {
    const newVal = parseInt(this.input.value) + delta;
    if (newVal <= 0) {
      this.reset();
    } else {
      this.input.value = newVal;
      this.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  reset() {
    this.input.value = 0;
    this.dispatchEvent(new Event('change', { bubbles: true }));
    this.hideControls();
  }

  showControls() {
    this.addButton.classList.add('hidden');
    this.controls.classList.remove('hidden');
  }

  hideControls() {
    this.addButton.classList.remove('hidden');
    this.controls.classList.add('hidden');
  }
}

if (!customElements.get('hybrid-quantity-selector')) {
  customElements.define('hybrid-quantity-selector', HybridQuantitySelector);
}
