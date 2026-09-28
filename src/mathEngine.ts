// mathEngine.ts
// Pequeno interpretador de expressões matemáticas para a calculadora científica.
// Suporta +  -  *  /  ^  %  !  parênteses e funções científicas (sin, cos, log...).
// Não usa eval/Function: é um parser recursivo descendente de verdade.

export type AngleMode = "deg" | "rad";

type TokenType = "number" | "identifier" | "operator" | "lparen" | "rparen" | "bang";

interface Token {
  type: TokenType;
  value: string;
}

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

function normalize(input: string): string {
  return input
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/π/g, "pi")
    .replace(/√/g, "sqrt")
    .replace(/,/g, ".");
}

function tokenize(input: string): Token[] {
  const src = normalize(input);
  const tokens: Token[] = [];
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      let num = ch;
      i++;
      while (i < src.length && /[0-9.]/.test(src[i])) {
        num += src[i];
        i++;
      }
      tokens.push({ type: "number", value: num });
      continue;
    }

    if (/[a-zA-Z]/.test(ch)) {
      let id = ch;
      i++;
      while (i < src.length && /[a-zA-Z]/.test(src[i])) {
        id += src[i];
        i++;
      }
      tokens.push({ type: "identifier", value: id });
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "lparen", value: ch });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen", value: ch });
      i++;
      continue;
    }
    if (ch === "!") {
      tokens.push({ type: "bang", value: ch });
      i++;
      continue;
    }
    if ("+-*/^%".includes(ch)) {
      tokens.push({ type: "operator", value: ch });
      i++;
      continue;
    }

    throw new Error(`Caractere inesperado: "${ch}"`);
  }

  return tokens;
}

function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function applyFunction(name: string, arg: number, angleMode: AngleMode): number {
  const toRad = (x: number) => (angleMode === "deg" ? (x * Math.PI) / 180 : x);
  const toDeg = (x: number) => (angleMode === "deg" ? (x * 180) / Math.PI : x);

  switch (name) {
    case "sin":
      return Math.sin(toRad(arg));
    case "cos":
      return Math.cos(toRad(arg));
    case "tan":
      return Math.tan(toRad(arg));
    case "asin":
      return toDeg(Math.asin(arg));
    case "acos":
      return toDeg(Math.acos(arg));
    case "atan":
      return toDeg(Math.atan(arg));
    case "log":
      return Math.log10(arg);
    case "ln":
      return Math.log(arg);
    case "sqrt":
      return Math.sqrt(arg);
    case "abs":
      return Math.abs(arg);
    default:
      throw new Error(`Função desconhecida: "${name}"`);
  }
}

class Parser {
  private tokens: Token[];
  private pos = 0;
  private angleMode: AngleMode;

  constructor(tokens: Token[], angleMode: AngleMode) {
    this.tokens = tokens;
    this.angleMode = angleMode;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const t = this.tokens[this.pos];
    if (!t) throw new Error("Expressão incompleta");
    this.pos++;
    return t;
  }

  parse(): number {
    const value = this.parseExpression();
    if (this.pos !== this.tokens.length) {
      throw new Error("Expressão inválida");
    }
    return value;
  }

  private parseExpression(): number {
    let value = this.parseTerm();
    while (this.peek()?.type === "operator" && (this.peek()!.value === "+" || this.peek()!.value === "-")) {
      const op = this.consume().value;
      const rhs = this.parseTerm();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }

  private startsFactor(t?: Token): boolean {
    if (!t) return false;
    return t.type === "number" || t.type === "identifier" || t.type === "lparen";
  }

  private parseTerm(): number {
    let value = this.parsePower();
    while (true) {
      const t = this.peek();
      if (t?.type === "operator" && (t.value === "*" || t.value === "/" || t.value === "%")) {
        const op = this.consume().value;
        const rhs = this.parsePower();
        if (op === "*") value = value * rhs;
        else if (op === "/") value = value / rhs;
        else value = value % rhs;
      } else if (this.startsFactor(t)) {
        // multiplicação implícita: 2(3+4), 2pi, 3sin(30)
        const rhs = this.parsePower();
        value = value * rhs;
      } else {
        break;
      }
    }
    return value;
  }

  private parsePower(): number {
    const base = this.parseUnary();
    if (this.peek()?.type === "operator" && this.peek()!.value === "^") {
      this.consume();
      const exponent = this.parsePower(); // associa à direita: 2^3^2 = 2^(3^2)
      return Math.pow(base, exponent);
    }
    return base;
  }

  private parseUnary(): number {
    const t = this.peek();
    if (t?.type === "operator" && (t.value === "-" || t.value === "+")) {
      this.consume();
      const value = this.parseUnary();
      return t.value === "-" ? -value : value;
    }
    return this.parsePostfix();
  }

  private parsePostfix(): number {
    let value = this.parsePrimary();
    while (this.peek()?.type === "bang") {
      this.consume();
      value = factorial(value);
    }
    return value;
  }

  private parsePrimary(): number {
    const t = this.peek();
    if (!t) throw new Error("Expressão incompleta");

    if (t.type === "number") {
      this.consume();
      return parseFloat(t.value);
    }

    if (t.type === "lparen") {
      this.consume();
      const value = this.parseExpression();
      const close = this.peek();
      if (close?.type !== "rparen") throw new Error("Parêntese não fechado");
      this.consume();
      return value;
    }

    if (t.type === "identifier") {
      this.consume();
      const name = t.value.toLowerCase();

      if (this.peek()?.type === "lparen") {
        this.consume();
        const arg = this.parseExpression();
        const close = this.peek();
        if (close?.type !== "rparen") throw new Error("Parêntese não fechado");
        this.consume();
        return applyFunction(name, arg, this.angleMode);
      }

      if (name in CONSTANTS) return CONSTANTS[name];
      throw new Error(`Identificador desconhecido: "${name}"`);
    }

    throw new Error("Token inesperado");
  }
}

export function evaluateExpression(input: string, angleMode: AngleMode = "deg"): number {
  if (!input.trim()) return 0;
  const tokens = tokenize(input);
  const parser = new Parser(tokens, angleMode);
  const result = parser.parse();
  if (Number.isNaN(result) || !Number.isFinite(result)) {
    throw new Error("Resultado indefinido");
  }
  return result;
}
