// Treasure System Data
window.TREASURES = [
  { id: 't_revive', name: 'Revival Egg', rarity: 'Epic', desc: 'Resurrect once with barrier.', price: 5000, effect: 'revive', val: 1 },
  { id: 't_magnet', name: 'Magnet Robot', rarity: 'Rare', desc: 'Increases magnet range.', price: 3000, effect: 'magnet', val: 30 },
  { id: 't_speed', name: 'Turbo Engine', rarity: 'Rare', desc: 'Increases base speed.', price: 3000, effect: 'speed', val: 50 },
  { id: 't_shield', name: 'Energy Shield', rarity: 'Epic', desc: 'Start with a barrier.', price: 4000, effect: 'barrier_start', val: 1 },
  { id: 't_coin', name: 'Coin Flower', rarity: 'Common', desc: 'Bonus coins at end.', price: 1000, effect: 'coin_bonus', val: 10 }
];

// Helper: Get treasure by ID
window.getTreasureById = function(id) {
  return window.TREASURES.find(t => t.id === id) || null;
};
