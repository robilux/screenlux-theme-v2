/**
 * Product Description Toggle Component
 * Handles expand/collapse functionality for product descriptions
 */

class ProductDescription extends HTMLElement {
  constructor() {
    super();
    this.button = this.querySelector('.description-toggle-btn');
    this.content = this.querySelector('.description-content');
    this.charLimit = parseInt(this.getAttribute('data-limit')) || 180;
    this.isExpanded = false;

    if (!this.button || !this.content) return;

    this.fullHTML = this.content.innerHTML;
    // Use innerText to preserve some formatting/spacing as text
    this.fullText = this.content.innerText.trim();

    if (this.fullText.length <= this.charLimit) {
      this.button.style.display = 'none';
      return;
    }

    // Initial truncated state
    this.truncatedHTML = this.fullText.substring(0, this.charLimit) + '...';
    this.content.innerHTML = this.truncatedHTML;

    this.button.addEventListener('click', this.toggle.bind(this));
  }

  toggle() {
    this.isExpanded = !this.isExpanded;

    // 1. Capture current height
    const startHeight = this.content.offsetHeight;

    // 2. Prepare state changes
    let endHeight;

    if (this.isExpanded) {
      // EXPANDING
      this.content.innerHTML = this.fullHTML;
      this.content.classList.add('expanded');
      this.button.textContent = 'Show less';
      endHeight = this.content.scrollHeight;
    } else {
      // COLLAPSING
      // Keep full content momentarily to calculate target height
      this.content.innerHTML = this.truncatedHTML;
      this.content.classList.remove('expanded');
      this.button.textContent = 'Read more';
      endHeight = this.content.scrollHeight;

      // Swap back to full content for the duration of the animation
      this.content.innerHTML = this.fullHTML;
    }

    // 3. Set height back to start and transition to end
    this.content.style.maxHeight = startHeight + 'px';

    // Force a reflow
    this.content.offsetHeight;

    this.content.style.transition = 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    this.content.style.maxHeight = endHeight + 'px';

    // 4. Cleanup and final state swap
    const onTransitionEnd = (e) => {
      if (e.propertyName !== 'max-height') return;

      if (this.isExpanded) {
        this.content.style.maxHeight = 'none';
      } else {
        // Swap to truncated text ONLY after animation finished
        this.content.innerHTML = this.truncatedHTML;
        this.content.style.maxHeight = 'none';
      }
      this.content.removeEventListener('transitionend', onTransitionEnd);
    };
    this.content.addEventListener('transitionend', onTransitionEnd);
  }
}

customElements.define('product-description', ProductDescription);
