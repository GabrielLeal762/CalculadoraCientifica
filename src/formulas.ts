// formulas.ts
// Funções puras de cálculo para as fórmulas de elétrica.
// Ficam separadas da interface (ElectricalFormulas.tsx) de propósito:
// fica mais fácil de testar, revisar e reaproveitar em outro lugar.

export interface Category {
  id: string;
  label: string;
  hint: string;
}

export const CATEGORIES: Category[] = [
  { id: "fundamentals", label: "Fundamentos", hint: "Lei de Ohm, potência e energia" },
  { id: "resistors", label: "Resistores", hint: "Fios, série, paralelo e divisores" },
  { id: "reactive", label: "Capacitores e indutores", hint: "Associações e energia armazenada" },
  { id: "ac", label: "Corrente alternada", hint: "Reatância, ressonância e potência CA" },
];

// ---------- Fundamentos: Lei de Ohm + Potência ----------

export type OhmVar = "V" | "I" | "R" | "P";

/**
 * Recebe duas das quatro grandezas (V, I, R, P) e devolve as quatro,
 * usando a fórmula adequada para cada combinação. Retorna null se o
 * número de grandezas conhecidas for diferente de dois.
 */
export function solveOhmPower(known: Partial<Record<OhmVar, number>>): Record<OhmVar, number> | null {
  const keys = (Object.keys(known) as OhmVar[]).filter(
    (k) => known[k] !== undefined && !Number.isNaN(known[k])
  );
  if (keys.length !== 2) return null;

  const has = (a: OhmVar, b: OhmVar) => keys.includes(a) && keys.includes(b);
  const V0 = known.V as number;
  const I0 = known.I as number;
  const R0 = known.R as number;
  const P0 = known.P as number;

  let V = V0, I = I0, R = R0, P = P0;

  if (has("V", "I")) {
    R = V0 / I0;
    P = V0 * I0;
  } else if (has("V", "R")) {
    I = V0 / R0;
    P = (V0 * V0) / R0;
  } else if (has("V", "P")) {
    I = P0 / V0;
    R = (V0 * V0) / P0;
  } else if (has("I", "R")) {
    V = I0 * R0;
    P = I0 * I0 * R0;
  } else if (has("I", "P")) {
    V = P0 / I0;
    R = P0 / (I0 * I0);
  } else if (has("R", "P")) {
    V = Math.sqrt(P0 * R0);
    I = Math.sqrt(P0 / R0);
  } else {
    return null;
  }

  if ([V, I, R, P].some((v) => v === undefined || Number.isNaN(v) || !Number.isFinite(v))) {
    return null;
  }
  return { V, I, R, P };
}

// ---------- Fundamentos: Energia e custo ----------

export interface EnergyCostResult {
  dailyKwh: number;
  monthlyKwh: number;
  monthlyCost: number;
}

export function calcEnergyCost(
  powerW: number,
  hoursPerDay: number,
  daysPerMonth: number,
  tariff: number
): EnergyCostResult {
  const dailyKwh = (powerW * hoursPerDay) / 1000;
  const monthlyKwh = dailyKwh * daysPerMonth;
  const monthlyCost = monthlyKwh * tariff;
  return { dailyKwh, monthlyKwh, monthlyCost };
}

// ---------- Resistores ----------

export const RESISTIVITY: { id: string; label: string; value: number }[] = [
  { id: "copper", label: "Cobre", value: 1.68e-8 },
  { id: "aluminum", label: "Alumínio", value: 2.82e-8 },
  { id: "iron", label: "Ferro", value: 9.71e-8 },
  { id: "silver", label: "Prata", value: 1.59e-8 },
  { id: "nichrome", label: "Níquel-cromo", value: 1.1e-6 },
];

export function calcWireResistance(resistivity: number, lengthM: number, areaMm2: number): number {
  const areaM2 = areaMm2 / 1_000_000;
  return (resistivity * lengthM) / areaM2;
}

export function sumSeries(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

export function sumParallel(values: number[]): number {
  const valid = values.filter((v) => v > 0);
  if (valid.length === 0) return 0;
  const inverseSum = valid.reduce((acc, v) => acc + 1 / v, 0);
  return inverseSum === 0 ? 0 : 1 / inverseSum;
}

export function calcVoltageDivider(vin: number, r1: number, r2: number): number {
  if (r1 + r2 === 0) return 0;
  return (vin * r2) / (r1 + r2);
}

// ---------- Capacitores e indutores ----------

export function capacitorSeries(values: number[]): number {
  return sumParallel(values); // mesma matemática de resistores em paralelo
}

export function capacitorParallel(values: number[]): number {
  return sumSeries(values);
}

export function calcCapacitorEnergy(capacitanceF: number, voltageV: number): number {
  return 0.5 * capacitanceF * voltageV * voltageV;
}

export function calcInductorEnergy(inductanceH: number, currentA: number): number {
  return 0.5 * inductanceH * currentA * currentA;
}

// ---------- Corrente alternada ----------

export interface ImpedanceResult {
  xl: number;
  xc: number;
  xNet: number;
  z: number;
  phaseDeg: number;
}

export function calcImpedance(
  r: number,
  inductanceH: number,
  capacitanceF: number,
  frequencyHz: number
): ImpedanceResult {
  const xl = 2 * Math.PI * frequencyHz * inductanceH;
  const xc = capacitanceF > 0 ? 1 / (2 * Math.PI * frequencyHz * capacitanceF) : 0;
  const xNet = xl - xc;
  const z = Math.sqrt(r * r + xNet * xNet);
  const phaseDeg = (Math.atan2(xNet, r) * 180) / Math.PI;
  return { xl, xc, xNet, z, phaseDeg };
}

export function calcResonantFrequency(inductanceH: number, capacitanceF: number): number {
  if (inductanceH <= 0 || capacitanceF <= 0) return 0;
  return 1 / (2 * Math.PI * Math.sqrt(inductanceH * capacitanceF));
}

export interface AcPowerResult {
  apparent: number; // VA
  active: number; // W
  reactive: number; // VAr
}

export function calcAcPower(voltageV: number, currentA: number, powerFactor: number): AcPowerResult {
  const apparent = voltageV * currentA;
  const active = apparent * powerFactor;
  const phi = Math.acos(Math.min(Math.max(powerFactor, -1), 1));
  const reactive = apparent * Math.sin(phi);
  return { apparent, active, reactive };
}

export function calcThreePhasePower(lineVoltage: number, lineCurrent: number, powerFactor: number): number {
  return Math.sqrt(3) * lineVoltage * lineCurrent * powerFactor;
}
