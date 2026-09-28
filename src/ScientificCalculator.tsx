import { useEffect, useMemo, useState } from "react";
import { evaluateExpression, type AngleMode } from "./mathEngine";

interface HistoryEntry {
  expression: string;
  result: string;
}

interface ButtonDef {
  label: string;
  action: string;
  variant?: "op" | "fn" | "eq" | "num";
}

// 7 linhas de 5 botões — a ordem aqui define a ordem visual no grid.
const BUTTON_ROWS: ButtonDef[][] = [
  [
    { label: "RAD/DEG", action: "toggle-angle", variant: "fn" },
    { label: "(", action: "(", variant: "fn" },
    { label: ")", action: ")", variant: "fn" },
    { label: "AC", action: "clear", variant: "fn" },
    { label: "⌫", action: "backspace", variant: "fn" },
  ],
  [
    { label: "sin", action: "sin(", variant: "fn" },
    { label: "cos", action: "cos(", variant: "fn" },
    { label: "tan", action: "tan(", variant: "fn" },
    { label: "√", action: "sqrt(", variant: "fn" },
    { label: "%", action: "%", variant: "op" },
  ],
  [
    { label: "log", action: "log(", variant: "fn" },
    { label: "ln", action: "ln(", variant: "fn" },
    { label: "x²", action: "^2", variant: "fn" },
    { label: "xʸ", action: "^", variant: "op" },
    { label: "n!", action: "!", variant: "fn" },
  ],
  [
    { label: "7", action: "7", variant: "num" },
    { label: "8", action: "8", variant: "num" },
    { label: "9", action: "9", variant: "num" },
    { label: "÷", action: "/", variant: "op" },
    { label: "π", action: "pi", variant: "fn" },
  ],
  [
    { label: "4", action: "4", variant: "num" },
    { label: "5", action: "5", variant: "num" },
    { label: "6", action: "6", variant: "num" },
    { label: "×", action: "*", variant: "op" },
    { label: "e", action: "e", variant: "fn" },
  ],
  [
    { label: "1", action: "1", variant: "num" },
    { label: "2", action: "2", variant: "num" },
    { label: "3", action: "3", variant: "num" },
    { label: "−", action: "-", variant: "op" },
    { label: "1/x", action: "inverse", variant: "fn" },
  ],
  [
    { label: "0", action: "0", variant: "num" },
    { label: ".", action: ".", variant: "num" },
    { label: "⌦", action: "clear-entry", variant: "fn" },
    { label: "+", action: "+", variant: "op" },
    { label: "=", action: "equals", variant: "eq" },
  ],
];

function formatResult(value: number): string {
  if (!Number.isFinite(value)) return "Erro";
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return value.toString();
  if (Math.abs(value) >= 1e12 || (Math.abs(value) < 1e-9 && value !== 0)) {
    return value.toExponential(6);
  }
  const rounded = parseFloat(value.toPrecision(10));
  return rounded.toString();
}

export default function ScientificCalculator() {
  const [expression, setExpression] = useState("");
  const [angleMode, setAngleMode] = useState<AngleMode>("deg");
  const [memory, setMemory] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    if (!expression.trim()) return "";
    try {
      return formatResult(evaluateExpression(expression, angleMode));
    } catch {
      return "";
    }
  }, [expression, angleMode]);

  function append(token: string) {
    setError(null);
    setExpression((prev) => prev + token);
  }

  function backspace() {
    setError(null);
    setExpression((prev) => prev.slice(0, -1));
  }

  function clear() {
    setError(null);
    setExpression("");
  }

  function clearEntry() {
    // Aproximação simples: apaga o último número digitado.
    setError(null);
    setExpression((prev) => prev.replace(/[0-9.]+$/, ""));
  }

  function handleEquals() {
    if (!expression.trim()) return;
    try {
      const value = evaluateExpression(expression, angleMode);
      const formatted = formatResult(value);
      setHistory((prev) => [{ expression, result: formatted }, ...prev].slice(0, 20));
      setExpression(formatted);
      setError(null);
    } catch {
      setError("Expressão inválida");
    }
  }

  function handleInverse() {
    if (!expression.trim()) return;
    setExpression((prev) => `1/(${prev})`);
  }

  function handleMemory(action: "mc" | "mr" | "m+" | "m-") {
    if (action === "mc") {
      setMemory(null);
      return;
    }
    if (action === "mr") {
      if (memory !== null) append(formatResult(memory));
      return;
    }
    try {
      const value = evaluateExpression(expression || "0", angleMode);
      setMemory((prev) => {
        const base = prev ?? 0;
        return action === "m+" ? base + value : base - value;
      });
    } catch {
      // expressão atual inválida: ignora silenciosamente
    }
  }

  function handleButton(action: string) {
    switch (action) {
      case "toggle-angle":
        setAngleMode((m) => (m === "deg" ? "rad" : "deg"));
        return;
      case "clear":
        clear();
        return;
      case "clear-entry":
        clearEntry();
        return;
      case "backspace":
        backspace();
        return;
      case "equals":
        handleEquals();
        return;
      case "inverse":
        handleInverse();
        return;
      default:
        append(action);
    }
  }

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (/^[0-9.]$/.test(e.key)) {
        append(e.key);
        return;
      }
      if (["+", "-", "*", "/", "^", "%", "(", ")"].includes(e.key)) {
        append(e.key);
        return;
      }
      if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        handleEquals();
        return;
      }
      if (e.key === "Backspace") {
        backspace();
        return;
      }
      if (e.key === "Escape") {
        clear();
        return;
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expression, angleMode]);

  return (
    <section className="calculator">
      <div className="calculator__display">
        <div className="calculator__mode">
          <span>{angleMode.toUpperCase()}</span>
          {memory !== null && <span className="calculator__memory-flag">M</span>}
        </div>
        <div className="calculator__expression">{expression || "0"}</div>
        <div className="calculator__result">
          {error ? <span className="calculator__error">{error}</span> : preview}
        </div>
      </div>

      <div className="calculator__memory">
        <button type="button" onClick={() => handleMemory("mc")}>
          MC
        </button>
        <button type="button" onClick={() => handleMemory("mr")}>
          MR
        </button>
        <button type="button" onClick={() => handleMemory("m+")}>
          M+
        </button>
        <button type="button" onClick={() => handleMemory("m-")}>
          M−
        </button>
      </div>

      <div className="calculator__pad">
        {BUTTON_ROWS.flat().map((btn, idx) => (
          <button
            key={`${btn.action}-${idx}`}
            type="button"
            className={`key key--${btn.variant ?? "num"}`}
            onClick={() => handleButton(btn.action)}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {history.length > 0 && (
        <div className="calculator__history">
          <h2>Histórico</h2>
          <ul>
            {history.map((entry, idx) => (
              <li key={idx} onClick={() => setExpression(entry.expression)}>
                <span className="history__expr">{entry.expression}</span>
                <span className="history__result">= {entry.result}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
