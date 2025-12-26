/**
 * Stage Configuration Data
 *
 * - Stages 1-10: Main progression (unique experiences)
 * - Stages 11-13: Loop section (repeats infinitely after completion)
 *
 * To customize stage lengths, simply modify the 'length' values below.
 * All calculations (cumulative distances, loop boundaries) update automatically.
 */
window.STAGE_CONFIG = [
  // Main Progression (1-10) - Gradually increasing length
  { id: 1,  themeIdx: 0, length: 2000, name: "BOOT SEQUENCE" },
  { id: 2,  themeIdx: 0, length: 2300, name: "DIGITAL CIRCUIT" },
  { id: 3,  themeIdx: 1, length: 2600, name: "NEON ALLEY" },
  { id: 4,  themeIdx: 1, length: 2900, name: "GLITCH CITY" },
  { id: 5,  themeIdx: 0, length: 3200, name: "DATA HIGHWAY" },
  { id: 6,  themeIdx: 2, length: 3500, name: "VOID ENTRANCE" },
  { id: 7,  themeIdx: 1, length: 3800, name: "CYBER STORM" },
  { id: 8,  themeIdx: 2, length: 4100, name: "THE VOID" },
  { id: 9,  themeIdx: 0, length: 4400, name: "SYSTEM REBOOT" },
  { id: 10, themeIdx: 2, length: 4500, name: "INFINITE HORIZON" },
  // Loop Section (11-13) - These repeat forever after stage 10
  { id: 11, themeIdx: 0, length: 3500, name: "LOOP: ALPHA", isLoop: true },
  { id: 12, themeIdx: 1, length: 4000, name: "LOOP: BETA",  isLoop: true },
  { id: 13, themeIdx: 2, length: 4500, name: "LOOP: OMEGA", isLoop: true }
];

// Precomputed values for performance
window.STAGE_CUMULATIVE = [];    // Cumulative distance at start of each stage
window.LOOP_START_DISTANCE = 0;  // Distance where loop section begins (stage 11)
window.LOOP_SECTION_LENGTH = 0;  // Total length of one loop cycle (11+12+13)
window.LOOP_START_INDEX = 10;    // Array index where loop stages begin

// Initialize computed values
(function() {
  let cumulative = 0;

  window.STAGE_CONFIG.forEach((stage, idx) => {
    window.STAGE_CUMULATIVE[idx] = cumulative;
    cumulative += stage.length;

    // Mark where loop section begins (first stage with isLoop=true)
    if (stage.isLoop && window.LOOP_START_DISTANCE === 0) {
      window.LOOP_START_DISTANCE = window.STAGE_CUMULATIVE[idx];
      window.LOOP_START_INDEX = idx;
    }
  });

  // Calculate total length of loop section
  const loopStages = window.STAGE_CONFIG.filter(s => s.isLoop);
  window.LOOP_SECTION_LENGTH = loopStages.reduce((sum, s) => sum + s.length, 0);

  // Debug output
  console.log('[STAGES] Configuration loaded:');
  console.log('  - Total stages:', window.STAGE_CONFIG.length);
  console.log('  - Loop starts at:', window.LOOP_START_DISTANCE + 'm (Stage ' + (window.LOOP_START_INDEX + 1) + ')');
  console.log('  - Loop cycle length:', window.LOOP_SECTION_LENGTH + 'm');
})();
