/**
 * Pure grading logic extracted from index.html.
 * All functions are side-effect-free and DOM-independent.
 */

/**
 * Determine CKD stage from GFR value.
 * @param {number|null} gfr
 * @returns {{ stage: string, color: string }|null}
 */
export function gfrStage(gfr) {
  if (gfr === null || gfr === undefined) return null;
  if (gfr >= 90) return { stage: 'G1',  label: 'Normal (>= 90)',               color: '#27ae60' };
  if (gfr >= 60) return { stage: 'G2',  label: 'Leicht reduziert (60-89)',      color: '#2E75B6' };
  if (gfr >= 45) return { stage: 'G3a', label: 'Leicht bis moderat (45-59)',    color: '#f39c12' };
  if (gfr >= 30) return { stage: 'G3b', label: 'Moderat bis schwer (30-44)',    color: '#E67E22' };
  if (gfr >= 15) return { stage: 'G4',  label: 'Schwer (15-29)',                color: '#C0392B' };
  return             { stage: 'G5',  label: 'Nierenversagen (< 15)',         color: '#8B0000' };
}

/**
 * Return the first matching note from a threshold list.
 * @param {number|null} gfr
 * @param {Array<[number, string]>} notes  – [[threshold, text], ...] ordered high→low
 * @returns {string}
 */
export function gfrNote(gfr, notes) {
  if (gfr === null || gfr === undefined) return '';
  for (var i = 0; i < notes.length; i++) {
    if (gfr < notes[i][0]) return notes[i][1];
  }
  return '';
}

/**
 * Calculate CRS grade (0-4) from state object.
 * @param {{ fever: number, htn: number, o2: number }} state
 * @returns {0|1|2|3|4}
 */
export function calcCRS(state) {
  if (!state.fever) return 0;
  var h = state.htn, x = state.o2;
  if (h === 3 || x === 3) return 4;
  if (h === 2 || x === 2) return 3;
  if (h === 1 || x === 1) return 2;
  return 1;
}

/**
 * Calculate total ICE score from ice object (each key is 0 or 1).
 * @param {Object} ice
 * @returns {number}
 */
export function iceTotal(ice) {
  var total = 0;
  for (var k in ice) total += ice[k];
  return total;
}

/**
 * Calculate ICANS grade (0-4) from ICE score and clinical parameters.
 * @param {Object} ice   – map of ICE sub-scores (0 or 1 each)
 * @param {{ consc: number, seizure: number, motor: number, edema: number, untestable: number }} clin
 * @returns {0|1|2|3|4}
 */
export function calcICANSGrade(ice, clin) {
  var total = iceTotal(ice);
  var g = 0;

  if (clin.untestable === 1) return 4;

  // ICE-based grade
  if      (total >= 7 && total <= 9) { if (g < 1) g = 1; }
  else if (total >= 3 && total <= 6) { if (g < 2) g = 2; }
  else if (total >= 1 && total <= 2) { if (g < 3) g = 3; }
  else if (total === 0)              { if (g < 3) g = 3; }
  // total === 10 → g stays 0 (no ICANS if no clinical criteria)

  // Consciousness
  if (clin.consc === 1) { if (g < 2) g = 2; }
  if (clin.consc === 2) { if (g < 3) g = 3; }
  if (clin.consc === 3) { g = 4; }

  // Seizure
  if (clin.seizure === 1) { if (g < 3) g = 3; }
  if (clin.seizure === 2) { g = 4; }

  // Motor
  if (clin.motor === 1) { g = 4; }

  // Edema
  if (clin.edema === 1) { if (g < 3) g = 3; }
  if (clin.edema === 2) { g = 4; }

  return g;
}

const HLH_PARAMS = ['ferritin', 'trig', 'fibri', 'cyto', 'got', 'fever', 'spleno', 'hemo', 'immuno'];

/**
 * Sum HLH screening score from values object.
 * @param {Object} hlhValues  – map of param → numeric score
 * @returns {{ score: number, filled: number, total: number }}
 */
export function calcHLHScore(hlhValues) {
  var score = 0;
  var filled = 0;
  HLH_PARAMS.forEach(function (p) {
    if (hlhValues[p] !== undefined) {
      score += hlhValues[p];
      filled++;
    }
  });
  return { score: score, filled: filled, total: HLH_PARAMS.length };
}

/**
 * Interpret HLH score into urgency/probability bucket.
 * Returns null when fewer than 4 parameters are filled.
 * @param {number} score
 * @param {number} filled
 * @returns {{ urgency: string, probability: string }|null}
 */
export function interpretHLHScore(score, filled) {
  if (filled < 4) return null;
  if (score <= 3) return { urgency: 'HLH unwahrscheinlich',          probability: '< 5%'    };
  if (score <= 5) return { urgency: 'HLH möglich – Monitoring',      probability: '~30–50%' };
  if (score <= 8) return { urgency: 'HLH wahrscheinlich!',           probability: '~70–88%' };
  return             { urgency: 'HLH sehr wahrscheinlich – NOTFALL', probability: '> 93%'   };
}
