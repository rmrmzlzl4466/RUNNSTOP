// 스킨 데이터 - 캐릭터 스탯 보너스 폐지됨 (barrier만 유지)
// statType: 'none' = 효과 없음, 'barrier' = 시작 시 배리어
window.SKINS = [
    // Common (10)
    { id: 0, name: 'Bit', rarity: 'Common', color: '#ecf0f1', trailColor: '#bdc3c7', coinPrice: 0, gemPrice: 0, condType: 'none', condVal: 0, condText: 'Default', desc: 'Basic model.', statType: 'none', statVal: 0 },
    { id: 1, name: 'Red Dot', rarity: 'Common', color: '#e74c3c', trailColor: '#c0392b', coinPrice: 500, gemPrice: 10, condType: 'none', condVal: 0, condText: 'Shop', desc: 'Red basic model.', statType: 'none', statVal: 0 },
    { id: 2, name: 'Blue Dot', rarity: 'Common', color: '#3498db', trailColor: '#2980b9', coinPrice: 500, gemPrice: 10, condType: 'none', condVal: 0, condText: 'Shop', desc: 'Blue basic model.', statType: 'none', statVal: 0 },
    { id: 3, name: 'Green Dot', rarity: 'Common', color: '#2ecc71', trailColor: '#27ae60', coinPrice: 500, gemPrice: 10, condType: 'none', condVal: 0, condText: 'Shop', desc: 'Green basic model.', statType: 'none', statVal: 0 },
    { id: 4, name: 'Yellow Dot', rarity: 'Common', color: '#f1c40f', trailColor: '#f39c12', coinPrice: 500, gemPrice: 10, condType: 'none', condVal: 0, condText: 'Shop', desc: 'Yellow basic model.', statType: 'none', statVal: 0 },
    { id: 5, name: 'Purple Dot', rarity: 'Common', color: '#9b59b6', trailColor: '#8e44ad', coinPrice: 500, gemPrice: 10, condType: 'none', condVal: 0, condText: 'Shop', desc: 'Purple basic model.', statType: 'none', statVal: 0 },
    { id: 6, name: 'Grey Dot', rarity: 'Common', color: '#95a5a6', trailColor: '#7f8c8d', coinPrice: 800, gemPrice: 15, condType: 'totalGames', condVal: 5, condText: 'Play 5 games', desc: 'Grey basic model.', statType: 'none', statVal: 0 },
    { id: 7, name: 'Dark Dot', rarity: 'Common', color: '#34495e', trailColor: '#2c3e50', coinPrice: 800, gemPrice: 15, condType: 'totalGames', condVal: 10, condText: 'Play 10 games', desc: 'Dark basic model.', statType: 'none', statVal: 0 },
    { id: 8, name: 'Mint Dot', rarity: 'Common', color: '#1abc9c', trailColor: '#16a085', coinPrice: 800, gemPrice: 15, condType: 'maxDist', condVal: 500, condText: 'Reach 500m', desc: 'Refreshing color.', statType: 'none', statVal: 0 },
    { id: 9, name: 'Orange Dot', rarity: 'Common', color: '#e67e22', trailColor: '#d35400', coinPrice: 800, gemPrice: 15, condType: 'maxDist', condVal: 800, condText: 'Reach 800m', desc: 'Energetic color.', statType: 'none', statVal: 0 },
    // Rare (8)
    { id: 10, name: 'Runner', rarity: 'Rare', color: '#fff', trailColor: '#3498db', coinPrice: 2000, gemPrice: 50, condType: 'maxDist', condVal: 1000, condText: 'Reach 1000m', desc: 'Sleek design.', statType: 'none', statVal: 0 },
    { id: 11, name: 'Miner', rarity: 'Rare', color: '#f39c12', trailColor: '#f1c40f', coinPrice: 2000, gemPrice: 50, condType: 'totalCoins', condVal: 500, condText: '500 Total Coins', desc: 'Gold rush style.', statType: 'none', statVal: 0 },
    { id: 12, name: 'Magnet Man', rarity: 'Rare', color: '#9b59b6', trailColor: '#8e44ad', coinPrice: 2500, gemPrice: 60, condType: 'totalCoins', condVal: 1000, condText: '1000 Total Coins', desc: 'Magnetic aura.', statType: 'none', statVal: 0 },
    { id: 13, name: 'Quicksilver', rarity: 'Rare', color: '#bdc3c7', trailColor: '#ecf0f1', coinPrice: 2500, gemPrice: 60, condType: 'totalGames', condVal: 20, condText: 'Play 20 games', desc: 'Liquid metal look.', statType: 'none', statVal: 0 },
    { id: 14, name: 'Veteran', rarity: 'Rare', color: '#7f8c8d', trailColor: '#95a5a6', coinPrice: 3000, gemPrice: 70, condType: 'totalDeaths', condVal: 10, condText: 'Die 10 times', desc: 'Battle-worn.', statType: 'none', statVal: 0 },
    { id: 15, name: 'Tycoon', rarity: 'Rare', color: '#e67e22', trailColor: '#f1c40f', coinPrice: 3000, gemPrice: 70, condType: 'totalCoins', condVal: 2000, condText: '2000 Total Coins', desc: 'Rich appearance.', statType: 'none', statVal: 0 },
    { id: 16, name: 'Guardian', rarity: 'Rare', color: '#27ae60', trailColor: '#2ecc71', coinPrice: 3500, gemPrice: 80, condType: 'maxDist', condVal: 1500, condText: 'Reach 1500m', desc: 'Looks sturdy.', statType: 'none', statVal: 0 },
    { id: 17, name: 'Shadow', rarity: 'Rare', color: '#2c3e50', trailColor: '#34495e', coinPrice: 3500, gemPrice: 80, condType: 'totalGames', condVal: 30, condText: 'Play 30 games', desc: 'Dark silhouette.', statType: 'none', statVal: 0 },
    // Epic (6)
    { id: 20, name: 'Neon Speeder', rarity: 'Epic', color: '#00ff00', trailColor: '#00ff00', coinPrice: 5000, gemPrice: 150, condType: 'maxDist', condVal: 2000, condText: 'Reach 2000m', desc: 'Neon glow.', statType: 'none', statVal: 0 },
    { id: 21, name: 'Gold King', rarity: 'Epic', color: '#f1c40f', trailColor: '#f39c12', coinPrice: 6000, gemPrice: 180, condType: 'totalCoins', condVal: 5000, condText: '5000 Total Coins', desc: 'Royal gold.', statType: 'none', statVal: 0 },
    { id: 22, name: 'Magneto', rarity: 'Epic', color: '#8e44ad', trailColor: '#9b59b6', coinPrice: 6000, gemPrice: 180, condType: 'totalCoins', condVal: 6000, condText: '6000 Total Coins', desc: 'Electromagnetic.', statType: 'none', statVal: 0 },
    { id: 23, name: 'Time Walker', rarity: 'Epic', color: '#3498db', trailColor: '#2980b9', coinPrice: 7000, gemPrice: 200, condType: 'totalGames', condVal: 50, condText: 'Play 50 games', desc: 'Time distortion.', statType: 'none', statVal: 0 },
    { id: 24, name: 'Phoenix', rarity: 'Epic', color: '#e74c3c', trailColor: '#c0392b', coinPrice: 8000, gemPrice: 250, condType: 'totalDeaths', condVal: 30, condText: 'Die 30 times', desc: 'Flame aura.', statType: 'none', statVal: 0 },
    { id: 25, name: 'Cyber', rarity: 'Epic', color: '#00d2d3', trailColor: '#00cec9', coinPrice: 8000, gemPrice: 250, condType: 'maxDist', condVal: 2500, condText: 'Reach 2500m', desc: 'Futuristic design.', statType: 'none', statVal: 0 },
    // Unique (6)
    { id: 30, name: 'Soccer Player', rarity: 'Unique', color: '#ffffff', trailColor: '#2980b9', coinPrice: 10000, gemPrice: 350, condType: 'totalGames', condVal: 100, condText: 'Play 100 games', desc: 'Sports champion.', statType: 'none', statVal: 0 },
    { id: 31, name: 'Alien', rarity: 'Unique', color: '#2ecc71', trailColor: '#27ae60', coinPrice: 10000, gemPrice: 350, condType: 'maxDist', condVal: 3000, condText: 'Reach 3000m', desc: 'Extraterrestrial.', statType: 'none', statVal: 0 },
    { id: 32, name: 'Vampire', rarity: 'Unique', color: '#c0392b', trailColor: '#e74c3c', coinPrice: 12000, gemPrice: 400, condType: 'totalDeaths', condVal: 50, condText: 'Die 50 times', desc: 'Dark immortal.', statType: 'none', statVal: 0 },
    { id: 33, name: 'Hacker', rarity: 'Unique', color: '#2c3e50', trailColor: '#00ff00', coinPrice: 12000, gemPrice: 400, condType: 'totalCoins', condVal: 10000, condText: '10000 Total Coins', desc: 'Digital phantom.', statType: 'none', statVal: 0 },
    { id: 34, name: 'Ghost', rarity: 'Unique', color: '#bdc3c7', trailColor: '#fff', coinPrice: 14000, gemPrice: 450, condType: 'totalGames', condVal: 150, condText: 'Play 150 games', desc: 'Ethereal spirit.', statType: 'none', statVal: 0 },
    { id: 35, name: 'Ninja', rarity: 'Unique', color: '#000', trailColor: '#e74c3c', coinPrice: 14000, gemPrice: 450, condType: 'maxDist', condVal: 3500, condText: 'Reach 3500m', desc: 'Silent assassin.', statType: 'none', statVal: 0 },
    // Legendary (4)
    { id: 40, name: 'Eye of Void', rarity: 'Legendary', color: '#e74c3c', trailColor: '#c0392b', coinPrice: 20000, gemPrice: 600, condType: 'totalDeaths', condVal: 100, condText: 'Die 100 times', desc: 'Starts with Barrier.', statType: 'barrier', statVal: 1 },
    { id: 41, name: 'Midas', rarity: 'Legendary', color: '#f1c40f', trailColor: '#f39c12', coinPrice: 25000, gemPrice: 700, condType: 'totalCoins', condVal: 30000, condText: '30000 Total Coins', desc: 'Golden touch.', statType: 'none', statVal: 0 },
    { id: 42, name: 'Sonic Boom', rarity: 'Legendary', color: '#3498db', trailColor: '#2980b9', coinPrice: 25000, gemPrice: 700, condType: 'maxDist', condVal: 5000, condText: 'Reach 5000m', desc: 'Supersonic style.', statType: 'none', statVal: 0 },
    { id: 43, name: 'Black Hole', rarity: 'Legendary', color: '#2c3e50', trailColor: '#8e44ad', coinPrice: 30000, gemPrice: 800, condType: 'totalGames', condVal: 300, condText: 'Play 300 games', desc: 'Cosmic void.', statType: 'none', statVal: 0 },
    // Mythic (2)
    { id: 50, name: 'The Creator', rarity: 'Mystic', color: '#00ff00', trailColor: '#fff', coinPrice: 100000, gemPrice: 2000, condType: 'maxDist', condVal: 10000, condText: 'Reach 10000m', desc: 'Divine presence.', statType: 'none', statVal: 0 },
    { id: 51, name: 'Void Walker', rarity: 'Mystic', color: '#8e44ad', trailColor: '#000', coinPrice: 100000, gemPrice: 2000, condType: 'totalDeaths', condVal: 500, condText: 'Die 500 times', desc: 'Starts with Barrier.', statType: 'barrier', statVal: 1 },
    { id: 999, name: 'Devil', rarity: 'Legendary', color: '#34495e', trailColor: '#ffffff', coinPrice: 1, gemPrice: 0, condType: 'none', condVal: 0, condText: 'Custom', desc: 'My Custom SVG Character', statType: 'none', statVal: 0, sprite:'./assets/images/characters/devil_boss.svg' }
  ];
