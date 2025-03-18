import { parse, ParserOptions } from "@babel/parser";
import generate from "@babel/generator";
import {
  ExpressionStatement,
  FunctionDeclaration,
  is,
  Node,
  VariableDeclaration,
} from "@babel/types";

export { generate };

export class Tower<T extends Node> {
  public ast: Node;
  constructor(stringOrAST: string | T, options?: Partial<ParserOptions>) {
    if (typeof stringOrAST === "string") {
      const parsedThing = parse(stringOrAST, {
        sourceType: "module",
        ...options,
      });
      this.ast = parsedThing.program;
    } else {
      this.ast = stringOrAST;
    }
  }

  // Get all the given types at the current scope
  private getType<T extends Node>(type: string, name: string): Tower<T> {
    const body = this.extractBody(this.ast);
    const ast = body.find((node) => {
      if (node.type === type) {
        if (is("FunctionDeclaration", node)) {
          return node.id?.name === name;
        }

        if (is("VariableDeclaration", node)) {
          const variableDeclarator = node.declarations[0];
          if (!is("VariableDeclarator", variableDeclarator)) {
            return false;
          }

          const identifier = variableDeclarator.id;
          if (!is("Identifier", identifier)) {
            return false;
          }

          return identifier.name === name;
        }
      }

      return false;
    });
    if (!ast) {
      throw new Error(`No AST found with name ${name}`);
    }

    assertIsType<T>(ast);
    return new Tower<T>(ast);
  }

  public getFunction(name: string): Tower<FunctionDeclaration> {
    return this.getType("FunctionDeclaration", name);
  }

  public getVariable(name: string): Tower<VariableDeclaration> {
    return this.getType("VariableDeclaration", name);
  }

  public getCalls(callSite: string): Array<Tower<ExpressionStatement>> {
    const body = this.extractBody(this.ast);
    const calls = body.filter((node) => {
      if (is("ExpressionStatement", node)) {
        const expression = node.expression;
        if (is("CallExpression", expression)) {
          const callee = expression.callee;

          switch (callee.type) {
            case "Identifier":
              return callee.name === callSite;
            case "MemberExpression":
              return generate(callee).code === callSite;
            default:
              return true;
          }
        }
      }

      if (is("VariableDeclarator", node)) {
        const init = node.init;
        if (is("CallExpression", init)) {
          const callee = init.callee;

          switch (callee.type) {
            case "Identifier":
              return callee.name === callSite;
            case "MemberExpression":
              return generate(callee).code === callSite;
            default:
              return true;
          }
        }
      }

      return false;
    });
    assertIsType<ExpressionStatement[]>(calls);
    return calls.map((call) => new Tower<ExpressionStatement>(call));
  }

  private extractBody(ast: Node): Node[] {
    switch (ast.type) {
      case "Program":
        return ast.body;
      case "FunctionDeclaration":
        return ast.body.body;
      case "VariableDeclaration":
        return ast.declarations;
      case "ArrowFunctionExpression":
        // eslint-disable-next-line no-case-declarations
        const blockStatement = ast.body;
        if (is("BlockStatement", blockStatement)) {
          return blockStatement.body;
        }

        throw new Error(`Unimplemented for ${ast.type}`);
      default:
        throw new Error(`Unimplemented for ${ast.type}`);
    }
  }

  public get generate(): string {
    return generate(this.ast).code;
  }

  public get compact(): string {
    return generate(this.ast, { compact: true }).code;
  }
}

function assertIsType<T extends Node | Node[]>(
  ast: Node | Node[],
): asserts ast is T {}
