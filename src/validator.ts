import ts from "typescript";
import type { Framework, ValidationResult } from "./types.js";

export class CodeValidator {
  async validate(code: string, framework: Framework): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const syntaxResult = this.checkSyntax(code);
    errors.push(...syntaxResult.errors);

    if (errors.length === 0) {
      const structureResult = this.checkStructure(code, framework);
      errors.push(...structureResult.errors);
      warnings.push(...structureResult.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private checkSyntax(code: string): { errors: string[] } {
    const errors: string[] = [];

    const isTypeScript = this.looksLikeTypeScript(code);
    const scriptKind = isTypeScript
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.JSX;

    const sourceFile = ts.createSourceFile(
      "validation.tsx",
      code,
      ts.ScriptTarget.Latest,
      true,
      scriptKind
    );

    const diagnostics = this.getSyntaxDiagnostics(sourceFile);
    for (const diagnostic of diagnostics) {
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n"
      );
      const line = diagnostic.start
        ? sourceFile.getLineAndCharacterOfPosition(diagnostic.start).line + 1
        : 0;
      errors.push(`Line ${line}: ${message}`);
    }

    return { errors };
  }

  private getSyntaxDiagnostics(sourceFile: ts.SourceFile): ts.Diagnostic[] {
    const compilerHost: ts.CompilerHost = {
      getSourceFile: (fileName) =>
        fileName === "validation.tsx" ? sourceFile : undefined,
      getDefaultLibFileName: () => "lib.d.ts",
      writeFile: () => {},
      getCurrentDirectory: () => "/",
      getCanonicalFileName: (f) => f,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => "\n",
      fileExists: (fileName) => fileName === "validation.tsx",
      readFile: () => undefined,
    };

    const program = ts.createProgram(
      ["validation.tsx"],
      {
        noEmit: true,
        allowJs: true,
        jsx: ts.JsxEmit.Preserve,
        target: ts.ScriptTarget.Latest,
        module: ts.ModuleKind.ESNext,
        skipLibCheck: true,
        noLib: true,
      },
      compilerHost
    );

    return [...program.getSyntacticDiagnostics(sourceFile)];
  }

  private checkStructure(
    code: string,
    framework: Framework
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const unclosedTags = this.findUnclosedJsxTags(code);
    errors.push(...unclosedTags);

    if (this.hasImportStatements(code)) {
      const missingImports = this.detectMissingImports(code, framework);
      warnings.push(...missingImports);
    }

    if (this.hasUnmatchedBraces(code)) {
      errors.push("Unmatched braces detected");
    }

    if (this.hasUnmatchedParentheses(code)) {
      errors.push("Unmatched parentheses detected");
    }

    return { errors, warnings };
  }

  private looksLikeTypeScript(code: string): boolean {
    const tsPatterns = [
      /:\s*(string|number|boolean|any|void|never|unknown)\b/,
      /interface\s+\w+/,
      /type\s+\w+\s*=/,
      /<\w+>/,
      /as\s+(string|number|boolean|any|const)\b/,
    ];
    return tsPatterns.some((pattern) => pattern.test(code));
  }

  private findUnclosedJsxTags(code: string): string[] {
    const errors: string[] = [];
    const selfClosingTags = new Set([
      "img",
      "br",
      "hr",
      "input",
      "meta",
      "link",
      "area",
      "base",
      "col",
      "embed",
      "param",
      "source",
      "track",
      "wbr",
    ]);

    const strippedCode = this.stripJsxExpressionContent(code);

    const tagStack: string[] = [];
    const tagRegex = /<\/?([A-Za-z][A-Za-z0-9.]*)[^>]*\/?>/g;
    let match;

    while ((match = tagRegex.exec(strippedCode)) !== null) {
      const fullMatch = match[0];
      const tagName = match[1];
      const tagNameLower = tagName.toLowerCase();

      if (fullMatch.endsWith("/>")) continue;
      if (selfClosingTags.has(tagNameLower)) continue;

      if (fullMatch.startsWith("</")) {
        if (tagStack.length === 0 || tagStack[tagStack.length - 1] !== tagName) {
          errors.push(`Unexpected closing tag: </${tagName}>`);
        } else {
          tagStack.pop();
        }
      } else {
        tagStack.push(tagName);
      }
    }

    for (const tag of tagStack) {
      errors.push(`Unclosed tag: <${tag}>`);
    }

    return errors;
  }

  private stripJsxExpressionContent(code: string): string {
    let result = "";
    let inString = false;
    let stringChar = "";
    let inTemplate = false;
    let braceDepth = 0;
    let inJsxExpressionBlock = false;

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const prevChar = i > 0 ? code[i - 1] : "";

      if (prevChar === "\\" && (inString || inTemplate)) {
        if (!inJsxExpressionBlock) result += char;
        continue;
      }

      if (!inString && !inTemplate && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        if (!inJsxExpressionBlock) result += char;
        continue;
      }

      if (inString && char === stringChar) {
        inString = false;
        if (!inJsxExpressionBlock) result += char;
        continue;
      }

      if (!inString && !inTemplate && char === "`") {
        inTemplate = true;
        if (!inJsxExpressionBlock) result += char;
        continue;
      }

      if (inTemplate && char === "`") {
        inTemplate = false;
        if (!inJsxExpressionBlock) result += char;
        continue;
      }

      if (inString || inTemplate) {
        if (!inJsxExpressionBlock) result += char;
        continue;
      }

      if (char === "{") {
        braceDepth++;
        if (braceDepth === 1) {
          const before = result.slice(-50);
          if (/>\s*$/.test(before) || /<[A-Za-z][^>]*$/.test(before)) {
            inJsxExpressionBlock = true;
            result += "{";
            continue;
          }
        }
        result += char;
        continue;
      }

      if (char === "}") {
        braceDepth--;
        if (inJsxExpressionBlock && braceDepth === 0) {
          inJsxExpressionBlock = false;
          result += "}";
          continue;
        }
        if (!inJsxExpressionBlock) result += char;
        continue;
      }

      if (!inJsxExpressionBlock) {
        result += char;
      }
    }

    return result;
  }

  private hasImportStatements(code: string): boolean {
    return /^import\s/m.test(code);
  }

  private detectMissingImports(code: string, framework: Framework): string[] {
    const warnings: string[] = [];

    const frameworkChecks: Record<Framework, { pattern: RegExp; importName: string }[]> = {
      react: [
        { pattern: /\buseState\b/, importName: "useState" },
        { pattern: /\buseEffect\b/, importName: "useEffect" },
        { pattern: /\buseRef\b/, importName: "useRef" },
        { pattern: /\buseMemo\b/, importName: "useMemo" },
        { pattern: /\buseCallback\b/, importName: "useCallback" },
        { pattern: /\buseContext\b/, importName: "useContext" },
        { pattern: /\buseReducer\b/, importName: "useReducer" },
      ],
      vue: [
        { pattern: /\bref\s*\(/, importName: "ref" },
        { pattern: /\breactive\s*\(/, importName: "reactive" },
        { pattern: /\bcomputed\s*\(/, importName: "computed" },
        { pattern: /\bwatch\s*\(/, importName: "watch" },
        { pattern: /\bonMounted\s*\(/, importName: "onMounted" },
      ],
      solid: [
        { pattern: /\bcreateSignal\b/, importName: "createSignal" },
        { pattern: /\bcreateEffect\b/, importName: "createEffect" },
        { pattern: /\bcreateStore\b/, importName: "createStore" },
      ],
      svelte: [],
      vanilla: [],
    };

    const checks = frameworkChecks[framework] || [];
    for (const { pattern, importName } of checks) {
      if (pattern.test(code)) {
        if (!this.hasImport(code, importName)) {
          warnings.push(`Possibly missing import: ${importName}`);
        }
      }
    }

    return warnings;
  }

  private hasImport(code: string, importName: string): boolean {
    const normalizedCode = code.replace(/\s+/g, " ");
    
    const namedImportPattern = new RegExp(
      `import\\s+[^;]*\\{[^}]*\\b${importName}\\b[^}]*\\}\\s*from`,
      "i"
    );
    if (namedImportPattern.test(normalizedCode)) return true;
    
    const destructuredPattern = new RegExp(
      `const\\s*\\{[^}]*\\b${importName}\\b[^}]*\\}\\s*=\\s*(require|React)`,
      "i"
    );
    if (destructuredPattern.test(normalizedCode)) return true;

    return false;
  }

  private hasUnmatchedBraces(code: string): boolean {
    return !this.areBracketsBalanced(code, "{", "}");
  }

  private hasUnmatchedParentheses(code: string): boolean {
    return !this.areBracketsBalanced(code, "(", ")");
  }

  private areBracketsBalanced(code: string, open: string, close: string): boolean {
    let count = 0;
    let inString = false;
    let stringChar = "";
    let inTemplate = false;
    let escaped = false;

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const prevChar = i > 0 ? code[i - 1] : "";

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (!inString && !inTemplate && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        continue;
      }

      if (inString && char === stringChar) {
        inString = false;
        continue;
      }

      if (!inString && !inTemplate && char === "`") {
        inTemplate = true;
        continue;
      }

      if (inTemplate && char === "`" && prevChar !== "\\") {
        inTemplate = false;
        continue;
      }

      if (inString || inTemplate) continue;

      if (char === open) count++;
      if (char === close) count--;
      if (count < 0) return false;
    }

    return count === 0;
  }
}
