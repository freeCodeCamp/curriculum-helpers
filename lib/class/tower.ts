/* eslint-disable */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
  Program,
  File,
  Declaration,
} from "@babel/types";

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

  private extractBody(ast: Node): Node[] {
    switch (ast.type) {
      case "Program":
        return ast.body;
      case "FunctionDeclaration":
        return ast.body.body;
      case "VariableDeclaration":
        return ast.declarations;
      default:
        throw new Error(`Unimplemented for ${ast.type}`);
    }
  }

  public get generate(): string {
    return generate(this.ast).code;
  }
}

function assertIsType<T extends Node>(ast: Node): asserts ast is T {
  return;
}
