/**
 * Screenlux Pricing Engine V2
 * Handles pure price logic and variant matching.
 */

window.ScreenluxEngine = {
  /**
   * Calculates the raw price for a single screen configuration.
   * @param {object} config - { width, height, solar, cassette }
   * @param {object} rules - pricing rules/constants
   * @returns {number} price in Euro cents
   */
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
    // 0. Base Validation Check (optional, but good for safety)
    const validation = this.validateDimensions(config.width, config.height);
    if (!validation.valid) return 0; // Return 0 if invalid

    const widthM = config.width / 1000;
    const heightM = config.height / 1000;
    const sqm = widthM * heightM;

    // Pricing Factors (Should ideally come from rules object, using defaults for now)
    const BASE_PRICE = rules.base_price || 50000; // Starting at €500
    const PRICE_PER_SQM = 5000; // €50 per sqm (example logic)

    // 1. Base Price
    let total = BASE_PRICE;

    // 2. Area Surcharge
    // Simple logic: If area > 2sqm, add cost per extra sqm
    if (sqm > 2) {
      const extraSqm = sqm - 2;
      total += Math.round(extraSqm * PRICE_PER_SQM);
    }

    // 3. Hardware Surcharges
    if (config.cassette === 'large') {
      total += rules.surcharge_cassette || 5000;
    }

    // 4. Motor Surcharge
    if (config.solar) {
      total += rules.surcharge_solar || 10000;
    }

    return total;
  },

  /**
   * Snaps a raw price to the nearest 50€ step variant.
   * @param {number} rawPrice - in cents
   * @param {Array} variants - list of {id, price} from ScreenluxData.screens
   * @returns {object|null} matching variant object
   */
  matchVariant(rawPrice, variants) {
    // 1. Round up to nearest 5000 cents (50€)
    const STEP = 5000;
    let target = Math.ceil(rawPrice / STEP) * STEP;

    // 2. Clamp
    const MIN_PRICE = 50000; // 500€
    const MAX_PRICE = 300000; // 3000€

    // 2. Clamp (2.3.1.2)

    if (target < MIN_PRICE) target = MIN_PRICE;
    if (target > MAX_PRICE) target = MAX_PRICE;

    // 3. Find match
    // Simple exact price search
    return variants.find((v) => v.price === target) || null;
  },

  /**
   * Generates the Cart API Items payload for a whole session
   * @param {object} state - Global state { screens: [], installationType, ... }
   * @param {object} data - ScreenluxData global
   */
  generateCartPayload(state, data) {
    const items = [];

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
          '_Screen ID': index + 1, // Hidden property for grouping?
          Reference: `Screen ${index + 1}`,
          Dimensions: `${screen.width}mm x ${screen.height}mm`,
          Power: screen.solar ? 'Solar' : 'Wired',
          Cassette: screen.cassette === 'large' ? 'Large' : 'Standard',
          'Fabric Color': screen.fabricColor || 'Standard',
          'Frame Color': screen.frameColor || 'Standard',
          'Calculated Price': `€${(rawPrice / 100).toFixed(2)}`,
        },
      });
    });

    // 2. Installation Service (Professional Only)
    if (state.installationType === 'professional') {
      const hasWired = state.screens.some((s) => !s.solar);
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
