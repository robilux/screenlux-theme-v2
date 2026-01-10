class HybridQuantitySelector extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.addButton = this.querySelector('.btn-add');
    this.controls = this.querySelector('.qty-controls');
    this.minusBtn = this.querySelector('.qty-minus');
    this.plusBtn = this.querySelector('.qty-plus');

    this.addButton.addEventListener('click', () => this.activate());
    this.minusBtn.addEventListener('click', () => this.update(-1));
    this.plusBtn.addEventListener('click', () => this.update(1));

    // Initial State Check
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
