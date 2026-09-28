import { useState } from "react";
import ScientificCalculator from "./ScientificCalculator";
import ElectricalFormulas from "./ElectricalFormulas";
import "./styles.css";

type View = "calculator" | "formulas";

export default function App() {
  const [view, setView] = useState<View>("calculator");

  return (
    <div className="app">
      <header className="app__header">
        <div className="brand">
          <svg className="brand__mark" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M13 2 L4 14 H11 L9 22 L20 9 H12.5 Z" />
          </svg>
          <div>
            <h1>Painel de elétrica</h1>
            <p>Calculadora científica e fórmulas para quem estuda elétrica</p>
          </div>
        </div>
        <div className="view-switch" role="tablist" aria-label="Selecionar seção">
          <button
            type="button"
            role="tab"
            aria-selected={view === "calculator"}
            className={view === "calculator" ? "is-active" : ""}
            onClick={() => setView("calculator")}
          >
            Calculadora
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "formulas"}
            className={view === "formulas" ? "is-active" : ""}
            onClick={() => setView("formulas")}
          >
            Fórmulas
          </button>
        </div>
      </header>

      <main className="app__main">{view === "calculator" ? <ScientificCalculator /> : <ElectricalFormulas />}</main>

      <footer className="app__footer">
        <p>Ferramenta de apoio aos estudos de elétrica e eletrônica — confira sempre os resultados antes de aplicá-los em projetos reais.</p>
      </footer>
    </div>
  );
}
