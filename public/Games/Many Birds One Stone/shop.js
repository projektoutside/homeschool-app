(() => {
  'use strict';

  const integer = (value, max) => (typeof value === 'number' || typeof value === 'string') && Number.isFinite(Number(value)) ? Math.max(0, Math.min(max, Math.floor(Number(value)))) : 0;
  const tankBonuses = [0, .15, .3, .5], tankPrices = [120, 240, 420];
  const HINT_COST = 100;
  const ballRadii = Object.freeze({ standard: 12, acorn: 10, boulder: 14 });
  const items = Object.freeze({
    bottle: { name: 'Ink bottle', price: 30 },
    acorn: { name: 'Acorn ball', price: 150 },
    boulder: { name: 'Boulder ball', price: 240 },
    wind: { name: 'Wind charm', price: 180 },
    steel: { name: 'Moonlit steel', price: 160 },
    jade: { name: 'Forest jade', price: 220 },
    firefly: { name: 'Firefly trail', price: 120 },
  });
  function stars(stats) {
    if (!stats || typeof stats !== 'object' || Array.isArray(stats)) return 0;
    const count = integer(stats.stars, 3), points = integer(stats.points, 150);
    return count >= 1 ? count : points >= 100 ? 1 + Math.floor((points - 100) / 25) : 0;
  }
  function normalize(raw, bestStats = {}) {
    if (!bestStats || typeof bestStats !== 'object' || Array.isArray(bestStats)) bestStats = {};
    const valid = raw && typeof raw === 'object' && raw.version === 1;
    const ledger = Array.from({ length: 18 }, (_, i) => Math.max(stars(bestStats[i + 1]), valid ? integer(raw.ledger?.[i], 3) : 0));
    const owned = valid && Array.isArray(raw.owned) ? [...new Set(raw.owned.filter(id => typeof id === 'string' && Object.hasOwn(items, id) && id !== 'bottle'))] : [];
    const welcome = 60 + ledger.reduce((sum, count) => sum + (count ? 60 + count * 15 : 0), 0);
    const priorPoints = Array.from({ length: 18 }, (_, i) => integer(bestStats[i + 1]?.points, 999999)).reduce((sum, points) => sum + points, 0);
    return {
      hintPoints: integer(valid && raw.hintPoints != null ? raw.hintPoints : priorPoints, 999999),
      version: 1, revision: valid ? integer(raw.revision, Number.MAX_SAFE_INTEGER) : 0,
      coins: valid ? integer(raw.coins, 999999) : welcome,
      tank: valid ? integer(raw.tank, 3) : 0,
      bottles: valid ? integer(raw.bottles, 9) : 0,
      owned, ball: valid && ['acorn', 'boulder'].includes(raw.ball) && owned.includes(raw.ball) ? raw.ball : 'standard',
      finish: valid && ['steel', 'jade'].includes(raw.finish) && owned.includes(raw.finish) ? raw.finish : 'brass',
      trail: valid && raw.trail === true && owned.includes('firefly'),
      wind: valid && raw.wind === true && owned.includes('wind'), ledger,
    };
  }
  function loadout(shop) {
    return { radius: ballRadii[shop.ball], inkMultiplier: 1 + tankBonuses[shop.tank], finish: shop.finish, trail: shop.trail, wind: shop.wind };
  }
  function coinPrice(shop, action) {
    if (action === 'tank') return tankPrices[shop.tank] || 0;
    if (action === 'bottle') return shop.bottles < 9 ? items.bottle.price : 0;
    return Object.hasOwn(items, action) && !shop.owned.includes(action) ? items[action].price : 0;
  }
  function canPurchase(shop, action, hintAvailable) {
    if (action === 'hint') return hintAvailable && shop.hintPoints >= HINT_COST;
    const price = coinPrice(shop, action);
    return price > 0 && shop.coins >= price;
  }
  function hasPurchase(shop, hintAvailable) {
    return canPurchase(shop, 'hint', hintAvailable)
      || canPurchase(shop, 'tank') || Object.keys(items).some(action => canPurchase(shop, action));
  }
  function reward(shop, level, count, points = 0) {
    const next = structuredClone(shop), previous = next.ledger[level - 1] || 0;
    const newStars = Math.max(0, integer(count, 3) - previous);
    const earned = 15 + (previous === 0 ? 60 : 0) + newStars * 15;
    next.ledger[level - 1] = Math.max(previous, integer(count, 3));
    next.coins = Math.min(999999, next.coins + earned);
    next.hintPoints = Math.min(999999, next.hintPoints + integer(points, 999999));
    next.revision++;
    return { next, earned };
  }
  function transact(shop, action) {
    const next = structuredClone(shop);
    const price = coinPrice(shop, action);
    let message = '';
    if (action === 'hint') {
      if (next.hintPoints < HINT_COST) return { error: `You need ${HINT_COST} Birds points to buy a hint.` };
      next.hintPoints -= HINT_COST;
      next.revision++;
      return { next, message: 'Hint purchased. Return to the game to see the guide.' };
    }
    if (action === 'tank') {
      if (next.tank >= 3) return { error: 'Your ink tank is already at maximum capacity.' };
      next.tank++;
      message = `Ink capacity upgraded to +${Math.round(tankBonuses[next.tank] * 100)}%. Ready for your next fresh attempt.`;
    } else if (action === 'bottle') {
      if (next.bottles >= 9) return { error: 'Your bag holds 9 bottles. Use one before buying more.' };
      next.bottles++; message = 'Ink bottle added to your bag. Use it before dropping.';
    } else if (action === 'use-bottle') {
      if (!next.bottles) return { error: 'Buy an ink bottle first.' };
      next.bottles--; message = 'Ink refilled! Your drawn lines are safe.';
    } else if (action === 'standard') {
      next.ball = 'standard'; message = 'Original ball selected for your next fresh attempt.';
    } else if (action === 'brass') {
      next.finish = 'brass'; message = 'Warm brass selected for your next fresh attempt.';
    } else if (Object.hasOwn(items, action)) {
      if (price) next.owned.push(action);
      if (Object.hasOwn(ballRadii, action)) next.ball = action;
      else if (action === 'firefly') next.trail = !shop.trail;
      else if (action === 'wind') next.wind = !shop.wind;
      else next.finish = action;
      const switchedOff = (action === 'firefly' && !next.trail) || (action === 'wind' && !next.wind);
      message = `${items[action].name} ${switchedOff ? 'switched off' : 'selected'} for your next fresh attempt.`;
    } else return { error: 'That item is unavailable.' };
    if (shop.coins < price) return { error: `You need ${price - shop.coins} more coins. Clear a level to earn more.` };
    next.coins -= price; next.revision++;
    return { next, message };
  }

  class WoodlandShop {
    constructor({ dialog, getShop, canRefill, canBuyHint, onAction, onClose }) {
      Object.assign(this, { dialog, getShop, canRefill, canBuyHint, onAction, onClose });
      this.returnFocus = null;
      dialog.querySelector('#closeShop').addEventListener('click', () => this.close());
      dialog.querySelector('#resumeFromShop').addEventListener('click', () => this.close());
      dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
      dialog.addEventListener('close', () => this.finishClose());
      dialog.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const targets = [...dialog.querySelectorAll('button:not(:disabled), [tabindex="0"]')];
        const first = targets[0], last = targets[targets.length - 1];
        if (event.shiftKey && document.activeElement === first || !event.shiftKey && document.activeElement === last) {
          event.preventDefault(); (event.shiftKey ? last : first).focus();
        }
      });
      dialog.addEventListener('click', event => {
        const button = event.target.closest('button[data-shop-action]');
        if (!button || button.disabled || !dialog.open || this.busy) return;
        this.busy = true;
        const result = onAction(button.dataset.shopAction);
        this.update();
        this.message(result.error || result.message, Boolean(result.error));
        this.purchaseTimer = window.setTimeout(() => { this.busy = false; }, 350);
      });
      // Use the same cached material renderer as the playfield, once per preview.
      const renderer = new WoodlandDropMechanism();
      dialog.querySelectorAll('canvas[data-finish]').forEach(canvas => {
        const ctx = canvas.getContext('2d'); ctx.scale(2, 2);
        renderer.drawStone(ctx, { x: 32, y: 32, radius: 1.75 * (ballRadii[canvas.dataset.ball] || ballRadii.standard), finish: canvas.dataset.finish });
      });
    }
    message(text, error = false) {
      const node = this.dialog.querySelector('#shopMessage');
      node.textContent = text; node.classList.toggle('is-error', error);
    }
    update() {
      const shop = this.getShop();
      this.dialog.querySelector('#shopBalance').textContent = shop.coins.toLocaleString();
      this.dialog.querySelector('#hintPoints').textContent = shop.hintPoints.toLocaleString();
      this.dialog.querySelector('#hintPrice').textContent = HINT_COST;
      this.dialog.querySelector('#bottleCount').textContent = `${shop.bottles} / 9 bottles in your bag`;
      this.dialog.querySelector('#tankDescription').textContent = shop.tank === 3
        ? 'Maximum capacity: 50% more ink on every fresh attempt.'
        : `${Math.round(tankBonuses[shop.tank] * 100)}% extra ink now. Upgrade to +${Math.round(tankBonuses[shop.tank + 1] * 100)}% on every fresh attempt.`;
      this.dialog.querySelector('#tankSteps').value = shop.tank;
      this.dialog.querySelectorAll('[data-shop-action]').forEach(button => {
        const id = button.dataset.shopAction;
        if (id === 'hint') {
          button.textContent = `Buy hint · ${HINT_COST} pts`;
          button.disabled = !canPurchase(shop, id, this.canBuyHint());
          return;
        }
        const price = coinPrice(shop, id);
        let label, unavailable = false;
        if (id === 'tank') { label = price ? `Upgrade · ${price}` : 'Fully upgraded'; unavailable = !price; }
        else if (id === 'bottle') { label = price ? `Buy bottle · ${price}` : 'Bag full'; unavailable = !price; }
        else if (id === 'use-bottle') { label = `Use bottle (${shop.bottles})`; unavailable = !shop.bottles || !this.canRefill(); }
        else {
          const toggle = id === 'wind' || id === 'firefly';
          const selected = id === shop.ball || id === shop.finish || id === 'firefly' && shop.trail || id === 'wind' && shop.wind;
          label = price ? `Buy · ${price}` : toggle ? (selected ? 'Switch off' : 'Switch on') : selected ? 'Selected' : 'Select';
          unavailable = selected && !toggle;
          button.setAttribute('aria-pressed', String(selected));
        }
        button.textContent = label;
        const name = id === 'tank' ? 'Ink tank' : id === 'use-bottle' ? 'Ink refill' : id === 'standard' ? 'Original ball' : id === 'brass' ? 'Warm brass' : items[id].name;
        button.setAttribute('aria-label', `${name}: ${label}${price ? ' coins' : ''}`);
        button.disabled = unavailable || (price > 0 && !canPurchase(shop, id));
        button.title = shop.coins < price ? `Earn ${price - shop.coins} more coins to buy this.` : '';
      });
      this.dialog.querySelector('#refillNote').textContent = this.canRefill()
        ? 'Restore your ink meter now. All drawn lines stay in place.'
        : 'Use a bottle after drawing, before dropping. Full ink needs no refill.';
    }
    open(returnFocus) {
      this.returnFocus = returnFocus; this.update();
      this.message('Equipment applies on your next fresh attempt. Bottles can refill ink now.');
      this.dialog.showModal();
      this.dialog.querySelector('#shopScroll').scrollTop = 0;
      this.dialog.querySelector('#closeShop').focus();
    }
    close() { if (this.dialog.open) { this.dialog.close(); this.finishClose(); } }
    finishClose() {
      if (this.dialog.open || !this.returnFocus) return;
      const focus = this.returnFocus; this.returnFocus = null;
      window.clearTimeout(this.purchaseTimer);
      this.busy = false;
      this.onClose(); if (focus.isConnected && !focus.disabled) focus.focus();
    }
  }
  window.WoodlandEconomy = Object.freeze({ normalize, loadout, reward, transact, hasPurchase, items });
  window.WoodlandShop = WoodlandShop;
})();
