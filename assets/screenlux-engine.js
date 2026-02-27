/**
 * Screenlux Pricing Engine V2
 * Handles pure price logic and variant matching.
 */

window.ScreenluxEngine = {
  /**
   * Validation Rules
   */
  constraints: {
    minWidth: 600,
    maxWidth: 6000,
    minHeight: 600,
    maxHeight: 5000,
  },

  /**
   * Validates screen dimensions.
   * @param {number} width - mm
   * @param {number} height - mm
   * @returns {object} { valid: boolean, error: string|null }
   */
  validateDimensions(width, height) {
    if (!width || !height) return { valid: false, error: 'Dimensions required' };

    if (width < this.constraints.minWidth)
      return { valid: false, error: `Min width is ${this.constraints.minWidth}mm` };
    if (width > this.constraints.maxWidth)
      return { valid: false, error: `Max width is ${this.constraints.maxWidth}mm` };

    if (height < this.constraints.minHeight)
      return { valid: false, error: `Min height is ${this.constraints.minHeight}mm` };
    if (height > this.constraints.maxHeight)
      return { valid: false, error: `Max height is ${this.constraints.maxHeight}mm` };

    return { valid: true, error: null };
  },

  /**
   * Calculates the raw price for a single screen configuration.
   * @param {object} config - { width, height, solar, cassette }
   * @param {object} rules - pricing rules/constants
   * @returns {number} price in Euro cents
   */
  calculateScreenPrice(config, rules) {
    // 0. Base Validation Check
    const validation = this.validateDimensions(config.width, config.height);
    if (!validation.valid) return 0;

    // 1. Base Price
    let total = 9500; // 95€

    // Calculate dimensions
    const widthM = config.width / 1000;
    const heightM = config.height / 1000;
    const sqm = widthM * heightM;

    // 2. Fabric Cost
    const fabricPricePerSqm = config.fabricType === 'blackout' ? 1500 : 1150;
    total += Math.round(sqm * fabricPricePerSqm);

    // 3. Cassette Cost
    let cassetteWidthPrice = 1600; // 16€
    let cassetteHeightPrice = 700; // 7€
    if (config.cassetteSize === 'large') {
      cassetteWidthPrice = 2500; // 25€
      cassetteHeightPrice = 900; // 9€
    }
    total += Math.round(widthM * cassetteWidthPrice + heightM * cassetteHeightPrice);

    // 4. Motor Surcharge
    if (config.motor === 'solar') {
      total += 3500; // 35€
    }

    return total;
  },

  /**
   * Snaps a raw price (cost) to a matching variant by SKU.
   * @param {number} rawPrice - calculated cost in cents
   * @param {Array} variants - list of {id, price, sku} from ScreenluxData.screens
   * @returns {object|null} matching variant object
   */
  matchVariant(rawPrice, variants) {
    const targetCost = rawPrice / 100;

    // First try exact match on SKU parse
    const match = variants.find((v) => v.sku && parseFloat(v.sku.replace(',', '.')) === targetCost);
    if (match) return match;

    // Fallback: find nearest by SKU
    const validVariants = variants.filter((v) => v.sku && !isNaN(parseFloat(v.sku.replace(',', '.'))));
    if (validVariants.length > 0) {
      return validVariants.reduce((prev, curr) => {
        const prevDiff = Math.abs(parseFloat(prev.sku.replace(',', '.')) - targetCost);
        const currDiff = Math.abs(parseFloat(curr.sku.replace(',', '.')) - targetCost);
        return currDiff < prevDiff ? curr : prev;
      });
    }

    // Default fallback
    return variants[0] || null;
  },

  /**
   * Generates the Cart API Items payload for a whole session
   * @param {object} state - Global state { screens: [], installationType, ... }
   * @param {object} data - ScreenluxData global
   */
  generateCartPayload(state, data) {
    const items = [];

    // Helper to find title by ID
    const findTitle = (list, id) => {
      const item = (list || []).find((x) => x.id == id);
      return item ? item.title : id;
    };

    // 1. Screens
    state.screens.forEach((screen, index) => {
      const rawPrice = this.calculateScreenPrice(screen, data.config);
      const variant = this.matchVariant(rawPrice, data.screens);

      if (!variant) {
        console.error('No matching price variant found for:', rawPrice);
        return;
      }

      items.push({
        id: variant.id,
        quantity: 1,
        properties: {
          '_Screen ID': index + 1,
          Reference: `Screen ${index + 1}`,
          Dimensions: `${screen.width}mm x ${screen.height}mm`,
          'Frame Color': findTitle(data.frameColors, screen.frameColor),
          'Fabric Color': findTitle(data.fabricColors, screen.fabricColor),
          'Fabric Transparency': findTitle(data.fabrics, screen.fabricType),
          'Cassette Size': findTitle(data.cassetteSizes, screen.cassetteSize),
          Motor: findTitle(data.motorOptions, screen.motor),
          'Calculated Price': `€${(rawPrice / 100).toFixed(2)}`,
        },
      });
    });

    // 2. Installation Service (Professional Only)
    if (state.installationType === 'professional') {
      const hasWired = state.screens.some((s) => s.motor !== 'solar');
      const targetTitle = hasWired ? 'Wired' : 'Solar';

      const serviceVariant = data.services.find((v) => v.title.includes(targetTitle));
      if (serviceVariant) {
        items.push({
          id: serviceVariant.id,
          quantity: 1,
        });
      }
    }

    // 3. Brackets (DIY Only)
    // Assumes 1 bracket per screen
    if (state.installationType === 'diy') {
      // Find the selected bracket variant ID from state (mocking selection here)
      // Ideally state.bracketId is set.
      if (state.bracketId) {
        items.push({
          id: state.bracketId,
          quantity: state.screens.length,
        });
      }
    }

    // 4. Add-ons
    Object.entries(state.addons || {}).forEach(([id, qty]) => {
      if (qty > 0) {
        items.push({
          id: parseInt(id),
          quantity: qty,
        });
      }
    });

    return { items };
  },
};
