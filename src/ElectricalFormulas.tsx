import { useState } from "react";
import {
  CATEGORIES,
  RESISTIVITY,
  type OhmVar,
  solveOhmPower,
  calcEnergyCost,
  calcWireResistance,
  sumSeries,
  sumParallel,
  calcVoltageDivider,
  capacitorSeries,
  capacitorParallel,
  calcCapacitorEnergy,
  calcInductorEnergy,
  calcImpedance,
  calcResonantFrequency,
  calcAcPower,
  calcThreePhasePower,
} from "./formulas";

// ---------- utilidades de exibição ----------

function toNum(v: string): number {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function fmt(n: number, digits = 4): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000 || (Math.abs(n) < 0.001 && n !== 0)) {
    return n.toExponential(3);
  }
  const rounded = n.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
  return rounded === "" || rounded === "-" ? "0" : rounded;
}

// ---------- peças de UI reutilizáveis ----------

function FormulaCard({
  title,
  expression,
  description,
  children,
}: {
  title: string;
  expression: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <article className="formula-card">
      <header className="formula-card__header">
        <h3>{title}</h3>
        <code className="formula-card__expression">{expression}</code>
      </header>
      <p className="formula-card__description">{description}</p>
      <div className="formula-card__body">{children}</div>
    </article>
  );
}

function Field({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="field">
      <span className="field__label">
        {label}
        {unit ? ` (${unit})` : ""}
      </span>
      <input
        className="field__input"
        type="text"
        inputMode="decimal"
        value={value}
        placeholder="0"
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function Result({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="result">
      <span className="result__label">{label}</span>
      <span className="result__value">
        {value} <small>{unit}</small>
      </span>
    </div>
  );
}

// ---------- diagrama: roda de Ohm e potência ----------

function OhmWheelDiagram() {
  const wedges = [
    { id: "V", path: "M170,170 L78.1,78.1 A130,130 0 0,1 261.9,78.1 Z" },
    { id: "P", path: "M170,170 L261.9,78.1 A130,130 0 0,1 261.9,261.9 Z" },
    { id: "R", path: "M170,170 L261.9,261.9 A130,130 0 0,1 78.1,261.9 Z" },
    { id: "I", path: "M170,170 L78.1,261.9 A130,130 0 0,1 78.1,78.1 Z" },
  ];

  const labels = [
    { id: "V", x: 170, y: 75, formula: "V = I·R" },
    { id: "P", x: 265, y: 170, formula: "P = V·I" },
    { id: "R", x: 170, y: 265, formula: "R = V/I" },
    { id: "I", x: 75, y: 170, formula: "I = V/R" },
  ];

  return (
    <svg className="ohm-wheel" viewBox="0 0 340 340" role="img" aria-label="Roda da lei de Ohm e da potência elétrica">
      {wedges.map((w, idx) => (
        <path key={w.id} d={w.path} className={idx % 2 === 0 ? "wheel-wedge wheel-wedge--a" : "wheel-wedge wheel-wedge--b"} />
      ))}
      <circle cx={170} cy={170} r={36} className="wheel-hub-circle" />
      <text x={170} y={178} textAnchor="middle" className="wheel-hub-label">
        Ω
      </text>
      {labels.map((l) => (
        <text key={l.id} x={l.x} y={l.y} textAnchor="middle">
          <tspan x={l.x} dy={0} className="wheel-letter">
            {l.id}
          </tspan>
          <tspan x={l.x} dy={18} className="wheel-formula">
            {l.formula}
          </tspan>
        </text>
      ))}
    </svg>
  );
}

// ---------- Fundamentos ----------

function OhmPowerCard() {
  const [values, setValues] = useState<Record<OhmVar, string>>({ V: "", I: "", R: "", P: "" });

  const known: Partial<Record<OhmVar, number>> = {};
  (Object.keys(values) as OhmVar[]).forEach((k) => {
    if (values[k].trim() !== "") {
      const n = toNum(values[k]);
      if (Number.isFinite(n)) known[k] = n;
    }
  });
  const knownCount = Object.keys(known).length;
  const solved = knownCount === 2 ? solveOhmPower(known) : null;

  const meta: Record<OhmVar, { label: string; unit: string }> = {
    V: { label: "Tensão", unit: "V" },
    I: { label: "Corrente", unit: "A" },
    R: { label: "Resistência", unit: "Ω" },
    P: { label: "Potência", unit: "W" },
  };

  return (
    <FormulaCard
      title="Roda de Ohm e potência"
      expression="V = I·R    P = V·I"
      description="Informe duas grandezas quaisquer entre tensão, corrente, resistência e potência: as outras duas são calculadas automaticamente."
    >
      <OhmWheelDiagram />
      <div className="grid-2">
        {(Object.keys(values) as OhmVar[]).map((k) => (
          <Field
            key={k}
            label={meta[k].label}
            unit={meta[k].unit}
            value={values[k]}
            onChange={(v) => setValues((prev) => ({ ...prev, [k]: v }))}
          />
        ))}
      </div>
      {knownCount < 2 && <p className="hint">Preencha duas grandezas para calcular as demais.</p>}
      {knownCount > 2 && <p className="hint">Use apenas duas grandezas conhecidas por vez.</p>}
      {solved && (
        <div className="result-grid">
          <Result label="Tensão" value={fmt(solved.V)} unit="V" />
          <Result label="Corrente" value={fmt(solved.I)} unit="A" />
          <Result label="Resistência" value={fmt(solved.R)} unit="Ω" />
          <Result label="Potência" value={fmt(solved.P)} unit="W" />
        </div>
      )}
    </FormulaCard>
  );
}

function EnergyCostCard() {
  const [power, setPower] = useState("100");
  const [hours, setHours] = useState("5");
  const [days, setDays] = useState("30");
  const [tariff, setTariff] = useState("0.95");

  const p = toNum(power), h = toNum(hours), d = toNum(days), t = toNum(tariff);
  const valid = [p, h, d, t].every((n) => Number.isFinite(n) && n >= 0);
  const result = valid ? calcEnergyCost(p, h, d, t) : null;

  return (
    <FormulaCard
      title="Energia consumida e custo"
      expression="E = P · t"
      description="Estime o consumo e o custo mensal aproximado de um aparelho, a partir da potência, do tempo de uso e da tarifa de energia."
    >
      <div className="grid-2">
        <Field label="Potência" unit="W" value={power} onChange={setPower} />
        <Field label="Uso diário" unit="h/dia" value={hours} onChange={setHours} />
        <Field label="Dias no mês" unit="dias" value={days} onChange={setDays} />
        <Field label="Tarifa" unit="R$/kWh" value={tariff} onChange={setTariff} />
      </div>
      {result && (
        <div className="result-grid">
          <Result label="Consumo diário" value={fmt(result.dailyKwh, 3)} unit="kWh" />
          <Result label="Consumo mensal" value={fmt(result.monthlyKwh, 2)} unit="kWh" />
          <Result label="Custo mensal" value={fmt(result.monthlyCost, 2)} unit="R$" />
        </div>
      )}
    </FormulaCard>
  );
}

// ---------- Resistores ----------

function WireResistanceCard() {
  const [materialId, setMaterialId] = useState(RESISTIVITY[0].id);
  const [length, setLength] = useState("10");
  const [area, setArea] = useState("2.5");

  const material = RESISTIVITY.find((m) => m.id === materialId) ?? RESISTIVITY[0];
  const l = toNum(length), a = toNum(area);
  const valid = Number.isFinite(l) && Number.isFinite(a) && a > 0;
  const r = valid ? calcWireResistance(material.value, l, a) : null;

  return (
    <FormulaCard
      title="Resistência de um fio"
      expression="R = ρ · L / A"
      description="Resistência elétrica de um condutor, a partir do material, do comprimento e da área da seção transversal."
    >
      <label className="field">
        <span className="field__label">Material</span>
        <select className="field__input" value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
          {RESISTIVITY.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} (ρ = {m.value.toExponential(2)} Ω·m)
            </option>
          ))}
        </select>
      </label>
      <div className="grid-2">
        <Field label="Comprimento" unit="m" value={length} onChange={setLength} />
        <Field label="Área da seção" unit="mm²" value={area} onChange={setArea} />
      </div>
      {r !== null && <Result label="Resistência" value={fmt(r, 4)} unit="Ω" />}
    </FormulaCard>
  );
}

function SeriesParallelCard({
  title,
  expression,
  description,
  unit,
  itemLabel,
  compute,
}: {
  title: string;
  expression: string;
  description: string;
  unit: string;
  itemLabel: string;
  compute: (values: number[]) => number;
}) {
  const [items, setItems] = useState<string[]>(["", ""]);

  const addItem = () => setItems((prev) => [...prev, ""]);
  const removeItem = (idx: number) => setItems((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev));
  const updateItem = (idx: number, v: string) => setItems((prev) => prev.map((val, i) => (i === idx ? v : val)));

  const numbers = items.map(toNum).filter((n) => Number.isFinite(n) && n > 0);
  const result = numbers.length >= 2 ? compute(numbers) : null;

  return (
    <FormulaCard title={title} expression={expression} description={description}>
      <div className="item-list">
        {items.map((val, idx) => (
          <div className="item-row" key={idx}>
            <Field label={`${itemLabel} ${idx + 1}`} unit={unit} value={val} onChange={(v) => updateItem(idx, v)} />
            {items.length > 2 && (
              <button type="button" className="btn-remove" onClick={() => removeItem(idx)} aria-label="Remover item">
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <button type="button" className="btn-add" onClick={addItem}>
        + adicionar {itemLabel.toLowerCase()}
      </button>
      {result !== null && <Result label="Equivalente" value={fmt(result, 4)} unit={unit} />}
    </FormulaCard>
  );
}

function VoltageDividerCard() {
  const [vin, setVin] = useState("12");
  const [r1, setR1] = useState("1000");
  const [r2, setR2] = useState("2000");

  const vinN = toNum(vin), r1N = toNum(r1), r2N = toNum(r2);
  const valid = [vinN, r1N, r2N].every((n) => Number.isFinite(n)) && r1N + r2N > 0;
  const vout = valid ? calcVoltageDivider(vinN, r1N, r2N) : null;

  return (
    <FormulaCard
      title="Divisor de tensão"
      expression="Vout = Vin · R2 / (R1 + R2)"
      description="Tensão de saída de um divisor resistivo simples, formado por dois resistores em série."
    >
      <div className="grid-2">
        <Field label="Tensão de entrada" unit="V" value={vin} onChange={setVin} />
        <Field label="R1" unit="Ω" value={r1} onChange={setR1} />
        <Field label="R2" unit="Ω" value={r2} onChange={setR2} />
      </div>
      {vout !== null && <Result label="Tensão de saída" value={fmt(vout, 4)} unit="V" />}
    </FormulaCard>
  );
}

// ---------- Capacitores e indutores ----------

function CapacitorEnergyCard() {
  const [cap, setCap] = useState("100"); // µF
  const [volt, setVolt] = useState("12");
  const c = toNum(cap), v = toNum(volt);
  const valid = Number.isFinite(c) && Number.isFinite(v);
  const energy = valid ? calcCapacitorEnergy(c / 1_000_000, v) : null;

  return (
    <FormulaCard
      title="Energia no capacitor"
      expression="E = ½ · C · V²"
      description="Energia armazenada no campo elétrico de um capacitor carregado."
    >
      <div className="grid-2">
        <Field label="Capacitância" unit="µF" value={cap} onChange={setCap} />
        <Field label="Tensão" unit="V" value={volt} onChange={setVolt} />
      </div>
      {energy !== null && <Result label="Energia armazenada" value={fmt(energy * 1000, 4)} unit="mJ" />}
    </FormulaCard>
  );
}

function InductorEnergyCard() {
  const [ind, setInd] = useState("10"); // mH
  const [curr, setCurr] = useState("2");
  const l = toNum(ind), i = toNum(curr);
  const valid = Number.isFinite(l) && Number.isFinite(i);
  const energy = valid ? calcInductorEnergy(l / 1000, i) : null;

  return (
    <FormulaCard
      title="Energia no indutor"
      expression="E = ½ · L · I²"
      description="Energia armazenada no campo magnético de um indutor percorrido por corrente."
    >
      <div className="grid-2">
        <Field label="Indutância" unit="mH" value={ind} onChange={setInd} />
        <Field label="Corrente" unit="A" value={curr} onChange={setCurr} />
      </div>
      {energy !== null && <Result label="Energia armazenada" value={fmt(energy * 1000, 4)} unit="mJ" />}
    </FormulaCard>
  );
}

// ---------- Corrente alternada ----------

function ImpedanceCard() {
  const [r, setR] = useState("100");
  const [ind, setInd] = useState("50"); // mH
  const [cap, setCap] = useState("10"); // µF
  const [freq, setFreq] = useState("60");

  const rN = toNum(r), lN = toNum(ind), cN = toNum(cap), fN = toNum(freq);
  const valid = [rN, lN, cN, fN].every((n) => Number.isFinite(n)) && fN > 0;
  const res = valid ? calcImpedance(rN, lN / 1000, cN / 1_000_000, fN) : null;

  return (
    <FormulaCard
      title="Reatância e impedância"
      expression="Z = √(R² + (Xl − Xc)²)"
      description="Reatâncias indutiva e capacitiva e impedância total de um circuito RLC série em corrente alternada."
    >
      <div className="grid-2">
        <Field label="Resistência" unit="Ω" value={r} onChange={setR} />
        <Field label="Indutância" unit="mH" value={ind} onChange={setInd} />
        <Field label="Capacitância" unit="µF" value={cap} onChange={setCap} />
        <Field label="Frequência" unit="Hz" value={freq} onChange={setFreq} />
      </div>
      {res && (
        <div className="result-grid">
          <Result label="Reatância indutiva" value={fmt(res.xl)} unit="Ω" />
          <Result label="Reatância capacitiva" value={fmt(res.xc)} unit="Ω" />
          <Result label="Impedância" value={fmt(res.z)} unit="Ω" />
          <Result label="Ângulo de fase" value={fmt(res.phaseDeg, 2)} unit="°" />
        </div>
      )}
    </FormulaCard>
  );
}

function ResonantFrequencyCard() {
  const [ind, setInd] = useState("50"); // mH
  const [cap, setCap] = useState("10"); // µF
  const l = toNum(ind), c = toNum(cap);
  const valid = Number.isFinite(l) && Number.isFinite(c) && l > 0 && c > 0;
  const f0 = valid ? calcResonantFrequency(l / 1000, c / 1_000_000) : null;

  return (
    <FormulaCard
      title="Frequência de ressonância"
      expression="f₀ = 1 / (2π√(L·C))"
      description="Frequência em que um circuito LC entra em ressonância, quando as reatâncias indutiva e capacitiva se igualam."
    >
      <div className="grid-2">
        <Field label="Indutância" unit="mH" value={ind} onChange={setInd} />
        <Field label="Capacitância" unit="µF" value={cap} onChange={setCap} />
      </div>
      {f0 !== null && <Result label="Frequência de ressonância" value={fmt(f0)} unit="Hz" />}
    </FormulaCard>
  );
}

function AcPowerCard() {
  const [volt, setVolt] = useState("220");
  const [curr, setCurr] = useState("5");
  const [pf, setPf] = useState("0.92");

  const v = toNum(volt), i = toNum(curr), p = toNum(pf);
  const valid = [v, i, p].every((n) => Number.isFinite(n)) && p >= 0 && p <= 1;
  const res = valid ? calcAcPower(v, i, p) : null;

  return (
    <FormulaCard
      title="Triângulo de potências em CA"
      expression="S = V·I    P = S·cosφ    Q = S·senφ"
      description="Potências aparente, ativa e reativa de um circuito em corrente alternada, a partir da tensão, corrente e fator de potência."
    >
      <div className="grid-2">
        <Field label="Tensão" unit="V" value={volt} onChange={setVolt} />
        <Field label="Corrente" unit="A" value={curr} onChange={setCurr} />
        <Field label="Fator de potência" unit="cosφ" value={pf} onChange={setPf} />
      </div>
      {res && (
        <div className="result-grid">
          <Result label="Potência aparente" value={fmt(res.apparent)} unit="VA" />
          <Result label="Potência ativa" value={fmt(res.active)} unit="W" />
          <Result label="Potência reativa" value={fmt(res.reactive)} unit="VAr" />
        </div>
      )}
    </FormulaCard>
  );
}

function ThreePhaseCard() {
  const [voltage, setVoltage] = useState("380");
  const [current, setCurrent] = useState("10");
  const [pf, setPf] = useState("0.9");

  const v = toNum(voltage), i = toNum(current), p = toNum(pf);
  const valid = [v, i, p].every((n) => Number.isFinite(n));
  const power = valid ? calcThreePhasePower(v, i, p) : null;

  return (
    <FormulaCard
      title="Potência trifásica"
      expression="P = √3 · Vl · Il · cosφ"
      description="Potência ativa total de um sistema trifásico equilibrado, a partir da tensão e corrente de linha e do fator de potência."
    >
      <div className="grid-2">
        <Field label="Tensão de linha" unit="V" value={voltage} onChange={setVoltage} />
        <Field label="Corrente de linha" unit="A" value={current} onChange={setCurrent} />
        <Field label="Fator de potência" unit="cosφ" value={pf} onChange={setPf} />
      </div>
      {power !== null && <Result label="Potência ativa" value={fmt(power)} unit="W" />}
    </FormulaCard>
  );
}

// ---------- composição por categoria ----------

export default function ElectricalFormulas() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);

  const cardsByCategory: Record<string, React.ReactNode[]> = {
    fundamentals: [<OhmPowerCard key="ohm" />, <EnergyCostCard key="energy" />],
    resistors: [
      <WireResistanceCard key="wire" />,
      <SeriesParallelCard
        key="rs"
        title="Resistores em série"
        expression="Req = R1 + R2 + ... + Rn"
        description="Some diretamente os valores dos resistores associados em série."
        unit="Ω"
        itemLabel="Resistor"
        compute={sumSeries}
      />,
      <SeriesParallelCard
        key="rp"
        title="Resistores em paralelo"
        expression="1/Req = 1/R1 + 1/R2 + ... + 1/Rn"
        description="Combine dois ou mais resistores em paralelo para encontrar a resistência equivalente."
        unit="Ω"
        itemLabel="Resistor"
        compute={sumParallel}
      />,
      <VoltageDividerCard key="vd" />,
    ],
    reactive: [
      <SeriesParallelCard
        key="cs"
        title="Capacitores em série"
        expression="1/Ceq = 1/C1 + 1/C2 + ... + 1/Cn"
        description="A capacitância equivalente em série é sempre menor do que a menor delas."
        unit="µF"
        itemLabel="Capacitor"
        compute={capacitorSeries}
      />,
      <SeriesParallelCard
        key="cp"
        title="Capacitores em paralelo"
        expression="Ceq = C1 + C2 + ... + Cn"
        description="Some diretamente os valores dos capacitores associados em paralelo."
        unit="µF"
        itemLabel="Capacitor"
        compute={capacitorParallel}
      />,
      <CapacitorEnergyCard key="ce" />,
      <InductorEnergyCard key="le" />,
    ],
    ac: [<ImpedanceCard key="imp" />, <ResonantFrequencyCard key="res" />, <AcPowerCard key="acp" />, <ThreePhaseCard key="3ph" />],
  };

  return (
    <div className="formulas">
      <nav className="formulas__nav" aria-label="Categorias de fórmulas">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`nav-switch ${activeCategory === cat.id ? "nav-switch--active" : ""}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            <span className="nav-switch__indicator" />
            <span className="nav-switch__text">
              <strong>{cat.label}</strong>
              <small>{cat.hint}</small>
            </span>
          </button>
        ))}
      </nav>
      <div className="formulas__grid">{cardsByCategory[activeCategory]}</div>
    </div>
  );
}
