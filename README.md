# Painel de Elétrica

Calculadora científica + fórmulas pré-prontas de elétrica (Lei de Ohm, potência,
energia, resistores, capacitores/indutores e corrente alternada).

Stack: **React 18 + TypeScript + Vite + CSS puro**.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal (normalmente http://localhost:5173).

Para gerar a versão de produção:

```bash
npm run build     # gera a pasta dist/
npm run preview   # serve a build localmente
```

## Subir para o Git

```bash
git init
git add .
git commit -m "Painel de elétrica: primeira versão"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/painel-eletrica.git
git push -u origin main
```

(Crie antes um repositório vazio no GitHub e troque a URL acima pela sua.)

## Deploy na Vercel

1. Acesse https://vercel.com e clique em **Add New… → Project**.
2. Importe o repositório do GitHub.
3. A Vercel detecta o Vite sozinha. Confira só:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Clique em **Deploy**. A cada `git push` na `main`, um novo deploy é feito automaticamente.

## Estrutura

```
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json / tsconfig.node.json
└── src/
    ├── main.tsx                 → ponto de entrada
    ├── App.tsx                  → alterna entre Calculadora e Fórmulas
    ├── ScientificCalculator.tsx → calculadora científica
    ├── ElectricalFormulas.tsx   → cartões de fórmulas de elétrica
    ├── mathEngine.ts            → interpretador de expressões (sem eval)
    ├── formulas.ts              → funções puras de cálculo
    └── styles.css               → tema "placa de circuito"
```

---
Ferramenta de apoio aos estudos: confira sempre os resultados antes de usá-los em projetos reais.
