import { describe, it, expect } from 'vitest';
import {
  gfrStage,
  gfrNote,
  calcCRS,
  iceTotal,
  calcICANSGrade,
  calcHLHScore,
  interpretHLHScore,
} from '../grading.js';

// ── GFR staging ──────────────────────────────────────────────────────────────

describe('gfrStage', () => {
  it('returns null for null input', () => {
    expect(gfrStage(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(gfrStage(undefined)).toBeNull();
  });

  it('classifies GFR 90 as G1', () => {
    expect(gfrStage(90).stage).toBe('G1');
  });

  it('classifies GFR 120 as G1', () => {
    expect(gfrStage(120).stage).toBe('G1');
  });

  it('classifies GFR 60 as G2', () => {
    expect(gfrStage(60).stage).toBe('G2');
  });

  it('classifies GFR 89 as G2', () => {
    expect(gfrStage(89).stage).toBe('G2');
  });

  it('classifies GFR 45 as G3a', () => {
    expect(gfrStage(45).stage).toBe('G3a');
  });

  it('classifies GFR 59 as G3a', () => {
    expect(gfrStage(59).stage).toBe('G3a');
  });

  it('classifies GFR 30 as G3b', () => {
    expect(gfrStage(30).stage).toBe('G3b');
  });

  it('classifies GFR 44 as G3b', () => {
    expect(gfrStage(44).stage).toBe('G3b');
  });

  it('classifies GFR 15 as G4', () => {
    expect(gfrStage(15).stage).toBe('G4');
  });

  it('classifies GFR 29 as G4', () => {
    expect(gfrStage(29).stage).toBe('G4');
  });

  it('classifies GFR 14 as G5', () => {
    expect(gfrStage(14).stage).toBe('G5');
  });

  it('classifies GFR 0 as G5', () => {
    expect(gfrStage(0).stage).toBe('G5');
  });

  it('returns a color for every stage', () => {
    [0, 14, 15, 30, 45, 60, 90].forEach((v) => {
      expect(gfrStage(v).color).toMatch(/^#/);
    });
  });
});

// ── gfrNote ──────────────────────────────────────────────────────────────────

describe('gfrNote', () => {
  const notes = [[30, 'dose-reduce'], [60, 'monitor']];

  it('returns empty string for null GFR', () => {
    expect(gfrNote(null, notes)).toBe('');
  });

  it('returns the first matching note (GFR < 30)', () => {
    expect(gfrNote(20, notes)).toBe('dose-reduce');
  });

  it('returns the second note when GFR is 30–59', () => {
    expect(gfrNote(45, notes)).toBe('monitor');
  });

  it('returns empty string when GFR is above all thresholds', () => {
    expect(gfrNote(80, notes)).toBe('');
  });

  it('boundary: GFR exactly at threshold uses next lower match', () => {
    // gfr < 60 is false when gfr === 60, so no match for second note
    expect(gfrNote(60, notes)).toBe('');
  });
});

// ── CRS grading ──────────────────────────────────────────────────────────────

describe('calcCRS', () => {
  it('returns 0 when no fever', () => {
    expect(calcCRS({ fever: 0, htn: 2, o2: 2 })).toBe(0);
  });

  it('returns 1 for fever only', () => {
    expect(calcCRS({ fever: 1, htn: 0, o2: 0 })).toBe(1);
  });

  it('returns 2 for fever + htn=1 (hypotension without vasopressor)', () => {
    expect(calcCRS({ fever: 1, htn: 1, o2: 0 })).toBe(2);
  });

  it('returns 2 for fever + o2=1 (O2 ≤ 6 l/min)', () => {
    expect(calcCRS({ fever: 1, htn: 0, o2: 1 })).toBe(2);
  });

  it('returns 3 for fever + htn=2 (1 vasopressor)', () => {
    expect(calcCRS({ fever: 1, htn: 2, o2: 0 })).toBe(3);
  });

  it('returns 3 for fever + o2=2 (O2 > 6 l/min / NIV)', () => {
    expect(calcCRS({ fever: 1, htn: 0, o2: 2 })).toBe(3);
  });

  it('returns 4 for fever + htn=3 (multiple vasopressors)', () => {
    expect(calcCRS({ fever: 1, htn: 3, o2: 0 })).toBe(4);
  });

  it('returns 4 for fever + o2=3 (invasive ventilation)', () => {
    expect(calcCRS({ fever: 1, htn: 0, o2: 3 })).toBe(4);
  });

  it('htn takes precedence correctly: htn=3 beats o2=1 → grade 4', () => {
    expect(calcCRS({ fever: 1, htn: 3, o2: 1 })).toBe(4);
  });
});

// ── ICE total ────────────────────────────────────────────────────────────────

describe('iceTotal', () => {
  it('sums all 1s to 10 (normal/full score)', () => {
    const ice = { o1:1,o2:1,o3:1,o4:1,n1:1,n2:1,n3:1,w1:1,a1:1,f1:1 };
    expect(iceTotal(ice)).toBe(10);
  });

  it('returns 0 for all zeros', () => {
    const ice = { o1:0,o2:0,o3:0,o4:0,n1:0,n2:0,n3:0,w1:0,a1:0,f1:0 };
    expect(iceTotal(ice)).toBe(0);
  });

  it('returns correct partial sum', () => {
    const ice = { o1:1,o2:0,o3:1,o4:0,n1:1,n2:0,n3:0,w1:0,a1:0,f1:0 };
    expect(iceTotal(ice)).toBe(3);
  });
});

// ── ICANS grading ────────────────────────────────────────────────────────────

const NO_CLIN = { consc: 0, seizure: 0, motor: 0, edema: 0, untestable: 0 };

function makeIce(total) {
  // Construct an ice object with `total` ones and the rest zeros (10 keys total)
  const keys = ['o1','o2','o3','o4','n1','n2','n3','w1','a1','f1'];
  const obj = {};
  keys.forEach((k, i) => { obj[k] = i < total ? 1 : 0; });
  return obj;
}

describe('calcICANSGrade – ICE-based (no clinical criteria)', () => {
  it('ICE 10 → grade 0 (no ICANS)', () => {
    expect(calcICANSGrade(makeIce(10), NO_CLIN)).toBe(0);
  });

  it('ICE 9 → grade 1', () => {
    expect(calcICANSGrade(makeIce(9), NO_CLIN)).toBe(1);
  });

  it('ICE 7 → grade 1 (lower boundary)', () => {
    expect(calcICANSGrade(makeIce(7), NO_CLIN)).toBe(1);
  });

  it('ICE 6 → grade 2', () => {
    expect(calcICANSGrade(makeIce(6), NO_CLIN)).toBe(2);
  });

  it('ICE 3 → grade 2 (lower boundary)', () => {
    expect(calcICANSGrade(makeIce(3), NO_CLIN)).toBe(2);
  });

  it('ICE 2 → grade 3', () => {
    expect(calcICANSGrade(makeIce(2), NO_CLIN)).toBe(3);
  });

  it('ICE 1 → grade 3', () => {
    expect(calcICANSGrade(makeIce(1), NO_CLIN)).toBe(3);
  });

  it('ICE 0 → grade 3', () => {
    expect(calcICANSGrade(makeIce(0), NO_CLIN)).toBe(3);
  });
});

describe('calcICANSGrade – untestable overrides everything', () => {
  it('untestable=1 always returns grade 4 regardless of ICE', () => {
    expect(calcICANSGrade(makeIce(10), { ...NO_CLIN, untestable: 1 })).toBe(4);
    expect(calcICANSGrade(makeIce(0),  { ...NO_CLIN, untestable: 1 })).toBe(4);
  });
});

describe('calcICANSGrade – consciousness', () => {
  it('consc=1 (somnolent) elevates ICE-1 grade to at least 2', () => {
    expect(calcICANSGrade(makeIce(9), { ...NO_CLIN, consc: 1 })).toBe(2);
  });

  it('consc=2 (sopor) elevates grade to at least 3', () => {
    expect(calcICANSGrade(makeIce(9), { ...NO_CLIN, consc: 2 })).toBe(3);
  });

  it('consc=3 (coma) forces grade 4', () => {
    expect(calcICANSGrade(makeIce(10), { ...NO_CLIN, consc: 3 })).toBe(4);
  });
});

describe('calcICANSGrade – seizure', () => {
  it('seizure=1 elevates grade to at least 3', () => {
    expect(calcICANSGrade(makeIce(9), { ...NO_CLIN, seizure: 1 })).toBe(3);
  });

  it('seizure=2 (status epilepticus) forces grade 4', () => {
    expect(calcICANSGrade(makeIce(10), { ...NO_CLIN, seizure: 2 })).toBe(4);
  });
});

describe('calcICANSGrade – motor deficit', () => {
  it('motor=1 forces grade 4', () => {
    expect(calcICANSGrade(makeIce(10), { ...NO_CLIN, motor: 1 })).toBe(4);
  });
});

describe('calcICANSGrade – edema', () => {
  it('edema=1 (focal) elevates grade to at least 3', () => {
    expect(calcICANSGrade(makeIce(9), { ...NO_CLIN, edema: 1 })).toBe(3);
  });

  it('edema=2 (diffuse) forces grade 4', () => {
    expect(calcICANSGrade(makeIce(10), { ...NO_CLIN, edema: 2 })).toBe(4);
  });
});

describe('calcICANSGrade – combined criteria take the highest grade', () => {
  it('ICE 5 (grade 2) + seizure=1 (grade 3) → grade 3', () => {
    expect(calcICANSGrade(makeIce(5), { ...NO_CLIN, seizure: 1 })).toBe(3);
  });

  it('ICE 0 (grade 3) + motor=1 → grade 4', () => {
    expect(calcICANSGrade(makeIce(0), { ...NO_CLIN, motor: 1 })).toBe(4);
  });
});

// ── HLH scoring ──────────────────────────────────────────────────────────────

describe('calcHLHScore', () => {
  it('returns score=0, filled=0 for empty object', () => {
    expect(calcHLHScore({})).toEqual({ score: 0, filled: 0, total: 9 });
  });

  it('counts only known parameters', () => {
    const result = calcHLHScore({ ferritin: 2, trig: 1, unknown: 99 });
    expect(result.filled).toBe(2);
    expect(result.score).toBe(3);
  });

  it('sums all 9 parameters when fully filled', () => {
    const full = { ferritin:2, trig:1, fibri:1, cyto:2, got:1, fever:1, spleno:1, hemo:2, immuno:1 };
    const r = calcHLHScore(full);
    expect(r.filled).toBe(9);
    expect(r.score).toBe(12);
  });

  it('total is always 9', () => {
    expect(calcHLHScore({}).total).toBe(9);
  });
});

describe('interpretHLHScore', () => {
  it('returns null when fewer than 4 parameters filled', () => {
    expect(interpretHLHScore(10, 3)).toBeNull();
  });

  it('score ≤ 3 → HLH unwahrscheinlich', () => {
    expect(interpretHLHScore(3, 5).urgency).toBe('HLH unwahrscheinlich');
  });

  it('score 4-5 → HLH möglich', () => {
    expect(interpretHLHScore(4, 5).urgency).toBe('HLH möglich – Monitoring');
    expect(interpretHLHScore(5, 5).urgency).toBe('HLH möglich – Monitoring');
  });

  it('score 6-8 → HLH wahrscheinlich', () => {
    expect(interpretHLHScore(6, 6).urgency).toBe('HLH wahrscheinlich!');
    expect(interpretHLHScore(8, 6).urgency).toBe('HLH wahrscheinlich!');
  });

  it('score > 8 → HLH sehr wahrscheinlich – NOTFALL', () => {
    expect(interpretHLHScore(9, 9).urgency).toBe('HLH sehr wahrscheinlich – NOTFALL');
    expect(interpretHLHScore(14, 9).urgency).toBe('HLH sehr wahrscheinlich – NOTFALL');
  });

  it('probability strings are non-empty for all buckets', () => {
    [3, 5, 8, 9].forEach((s) => {
      expect(interpretHLHScore(s, 5).probability.length).toBeGreaterThan(0);
    });
  });
});
