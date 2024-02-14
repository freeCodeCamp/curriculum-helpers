import { parse, ParserOptions } from "@babel/parser";
import generate, { GeneratorOptions } from "@babel/generator";
import {
  ArrowFunctionExpression,
  ExpressionStatement,
  FunctionDeclaration,
  Identifier,
  ImportDeclaration,
  is,
  Node,
  VariableDeclaration,
  Statement,
} from "@babel/types";

type BabeliserOptions = { maxScopeDepth: number };
type Scope = Array<string>;
type ScopedStatement = Statement & { scope: Scope };

export class Babeliser {
  public parsedCode: ReturnType<typeof parse>;
  private maxScopeDepth = 4;
  public codeString: string;
  constructor(
    codeString: string,
    options?: Partial<ParserOptions & BabeliserOptions>
  ) {
    this.parsedCode = parse(codeString, {
      sourceType: "module",
      ...options,
    });
    if (options?.maxScopeDepth) {
      this.maxScopeDepth = options.maxScopeDepth;
    }

    this.codeString = codeString;
  }

  public getArrowFunctionExpressions() {
    const arrowFunctionDeclarations =
      this._recurseBodiesForType<ArrowFunctionExpression>(
        "ArrowFunctionExpression"
      );
    return arrowFunctionDeclarations;
  }

  public getExpressionStatements() {
    const expressionStatements =
      this._recurseBodiesForType<ExpressionStatement>("ExpressionStatement");
    return expressionStatements;
  }

  public getFunctionDeclarations() {
    const functionDeclarations =
      this._recurseBodiesForType<FunctionDeclaration>("FunctionDeclaration");
    return functionDeclarations;
  }

  public getImportDeclarations() {
    const expressionStatements =
      this._recurseBodiesForType<ImportDeclaration>("ImportDeclaration");
    return expressionStatements;
  }

  public getType<T>(type: string) {
    return this._recurseBodiesForType<T>(type);
  }

  public getVariableDeclarations() {
    const variableDeclarations =
      this._recurseBodiesForType<VariableDeclaration>("VariableDeclaration");
    return variableDeclarations;
  }

  public getExpressionStatement(
    name: string,
    scope: Scope = ["global"]
  ): (ExpressionStatement & { scope: Scope }) | undefined {
    const expressionStatements = this.getExpressionStatements().filter((a) =>
      this._isInScope(a.scope, scope)
    );
    const expressionStatement = expressionStatements.find((e) => {
      const expression = e.expression;
      if (is("CallExpression", expression)) {
        if (name.includes(".")) {
          const [objectName, methodName] = name.split(".");
          const memberExpression = expression.callee;
          if (is("MemberExpression", memberExpression)) {
            const object = memberExpression.object;
            const property = memberExpression.property;
            if (is("Identifier", object) && is("Identifier", property)) {
              return object.name === objectName && property.name === methodName;
            }
          }
        }

        const identifier = expression.callee;
        if (is("Identifier", identifier) && identifier.name === name) {
          return true;
        }
      }

      if (is("AwaitExpression", expression)) {
        const callExpression = expression.argument;
        if (is("CallExpression", callExpression)) {
          const identifier = callExpression.callee;
          if (is("Identifier", identifier)) {
            return identifier.name === name;
          }
        }
      }

      return false;
    });
    return expressionStatement;
  }

  public generateCode(ast: Node, options?: GeneratorOptions) {
    return generate(ast, options).code;
  }

  public getLineAndColumnFromIndex(index: number) {
    const linesBeforeIndex = this.codeString.slice(0, index).split("\n");
    const line = linesBeforeIndex.length;
    const column = linesBeforeIndex.pop()?.length;
    return { line, column };
  }

  private _isInScope(scope: Scope, targetScope: Scope = ["global"]): boolean {
    if (targetScope.length === 1 && targetScope[0] === "global") {
      return true;
    }

    if (scope.length < targetScope.length) {
      return false;
    }

    const scopeString = scope.join(".");
    const targetScopeString = targetScope.join(".");
    return scopeString.includes(targetScopeString);
  }

  private _recurseBodiesForType<T>(type: string): Array<T & { scope: Scope }> {
    const body = this.parsedCode.program.body;
    const types = [];
    for (const statement of body) {
      const a = this._recurse(statement, (a) => a?.type === type, ["global"]);
      if (a?.length) {
        types.push(...a);
      }
    }

    // @ts-expect-error There is no easy wat to type this without writing out constraints to the 40+ types
    return types;
  }

  private _recurse(
    // This is kind of a hack, since we're mutating val. It needs to be able to
    // have a scope parameter, though it's never passed in with one.
    val: Statement & { scope?: Scope },
    isTargetType: (arg: { type: string }) => boolean,
    scope: Array<string>
  ): ScopedStatement[] {
    const matches: ScopedStatement[] = [];
    if (scope.length >= this.maxScopeDepth) {
      return matches;
    }

    if (val && typeof val === "object") {
      if (!Array.isArray(val)) {
        val.scope = scope;
      }

      if (isTargetType(val)) {
        // @ts-expect-error See `val` parameter
        matches.push(val);
      }

      const currentScope = [...scope];
      const nearestIdentifier: undefined | Identifier = Object.values(val).find(
        (v) => v?.type === "Identifier"
      );
      if (nearestIdentifier) {
        currentScope.push(nearestIdentifier.name);
      }

      for (const v of Object.values(val)) {
        const mat = this._recurse(v, isTargetType, currentScope);
        const toPush = mat?.filter(Boolean).flat();
        if (toPush?.length) {
          matches.push(...toPush.flat());
        }
      }
    }

    return matches;
  }
}
