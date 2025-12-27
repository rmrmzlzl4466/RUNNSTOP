// Treasure System Data
// 효과 종류:
// - revive: 런당 1회 부활 (barrier와 함께)
// - barrier_start: 런 시작 시 배리어
// - coin_bonus: 코인 보너스 % (상한 50%)
// - booster_enhance: 부스터 거리 +20% (신규)
// - magnet_enhance: 자석 지속시간 +2초 (신규)
window.TREASURES = [
  { id: 't_revive', name: 'Revival Egg', rarity: 'Epic', desc: 'Resurrect once with barrier.', price: 5000, effect: 'revive', val: 1 },
  { id: 't_magnet', name: 'Magnet Robot', rarity: 'Rare', desc: 'Magnet lasts +2 seconds.', price: 3000, effect: 'magnet_enhance', val: 2 },
  { id: 't_speed', name: 'Turbo Engine', rarity: 'Rare', desc: 'Booster travels +20% farther.', price: 3000, effect: 'booster_enhance', val: 0.20 },
  { id: 't_shield', name: 'Energy Shield', rarity: 'Epic', desc: 'Start with a barrier.', price: 4000, effect: 'barrier_start', val: 1 },
  { id: 't_coin', name: 'Coin Flower', rarity: 'Common', desc: 'Bonus coins +10% (max 50%).', price: 1000, effect: 'coin_bonus', val: 10 }
];

// Helper: Get treasure by ID
window.getTreasureById = function(id) {
  return window.TREASURES.find(t => t.id === id) || null;
};
