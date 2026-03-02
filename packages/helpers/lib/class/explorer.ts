import {
  Node,
  SourceFile,
  createSourceFile,
  ScriptTarget,
  ScriptKind,
  TypeAliasDeclaration,
  VariableStatement,
  FunctionDeclaration,
  SyntaxKind,
  Identifier,
  ArrowFunction,
  FunctionExpression,
  InterfaceDeclaration,
  ClassDeclaration,
  MethodDeclaration,
  PropertyDeclaration,
  TypeElement,
  ClassElement,
  NodeArray,
  isSourceFile,
  isBlock,
  isVariableStatement,
  isParameter,
  isPropertyDeclaration,
  isTypeAliasDeclaration,
  isFunctionDeclaration,
  isMethodDeclaration,
  isArrowFunction,
  isFunctionExpression,
  isClassDeclaration,
  isInterfaceDeclaration,
  isIdentifier,
  isPropertySignature,
  isTypeLiteralNode,
} from "typescript";

type TypeProp = {
  name: string;
  type?: string;
  isOptional?: boolean;
};

function createSource(source: string): SourceFile {
  return createSourceFile(
    "inline.ts",
    source,
    ScriptTarget.Latest,
    true,
    ScriptKind.TS,
  );
}

function findMembers(
  tree: Node,
): NodeArray<TypeElement | ClassElement> | undefined {
  // Handle VariableStatement with TypeLiteral annotation
  if (isVariableStatement(tree)) {
    const declaration = tree.declarationList.declarations[0];
    return declaration.type && isTypeLiteralNode(declaration.type)
      ? declaration.type.members
      : undefined;
  }

  // Handle InterfaceDeclaration, TypeLiteralNode and ClassDeclaration directly
  if (
    isInterfaceDeclaration(tree) ||
    isTypeLiteralNode(tree) ||
    isClassDeclaration(tree)
  ) {
    return tree.members;
  }

  // Handle TypeAliasDeclaration with TypeLiteral
  if (isTypeAliasDeclaration(tree)) {
    return isTypeLiteralNode(tree.type) ? tree.type.members : undefined;
  }

  // Handle PropertySignature, PropertyDeclaration and Parameter: if it has a type literal annotation, return its members
  if (
    isPropertySignature(tree) ||
    isPropertyDeclaration(tree) ||
    isParameter(tree)
  ) {
    return tree.type && isTypeLiteralNode(tree.type)
      ? tree.type.members
      : undefined;
  }
}

function createTree(
  code: string,
  kind:
    | SyntaxKind.TypeReference
    | SyntaxKind.MethodDeclaration
    | SyntaxKind.Unknown = SyntaxKind.Unknown,
): Node | null {
  if (!code.trim()) {
    return null;
  }

  let sourceFile: SourceFile;

  if (kind === SyntaxKind.MethodDeclaration) {
    sourceFile = createSource(`class _ { ${code} }`);
    const classDecl = sourceFile.statements[0] as ClassDeclaration;
    const methodDecl = classDecl.members.find((member) =>
      isMethodDeclaration(member),
    );
    return methodDecl || null;
  }

  if (kind === SyntaxKind.TypeReference) {
    sourceFile = createSource(`let _: ${code};`);
    const varStatement = sourceFile.statements[0] as VariableStatement;
    const declaration = varStatement.declarationList.declarations[0];
    return declaration.type || null;
  }

  sourceFile = createSource(code);
  return sourceFile;
}

const removeSemicolons = (nodes: readonly Node[]): Node[] =>
  nodes.filter(({ kind }) => kind !== SyntaxKind.SemicolonToken);

const areNodesEquivalent = (
  node1: Node | null,
  node2: Node | null,
): boolean => {
  if (node1 === null && node2 === null) return true;
  if (node1 === null || node2 === null) return false;

  // Unwrap single-statement SourceFiles to their statement for comparison
  let current1 = node1;
  let current2 = node2;

  if (isSourceFile(current1) && current1.statements.length === 1) {
    current1 = current1.statements[0];
  }

  if (isSourceFile(current2) && current2.statements.length === 1) {
    current2 = current2.statements[0];
  }

  if (current1.kind !== current2.kind) return false;

  const children1 = removeSemicolons(current1.getChildren());
  const children2 = removeSemicolons(current2.getChildren());

  if (children1.length === 0 && children2.length === 0) {
    // Leaf node - compare text content with normalized quotes
    if ("text" in node1 && "text" in node2) {
      // If the `text` property exists, it is the raw, unquoted value. e.g. if
      // getText() returns '"a-string"', the `text` property will be 'a-string'.
      return node1.text === node2.text;
    }

    return node1.getText() === node2.getText();
  }

  if (children1.length !== children2.length) return false;

  for (let i = 0; i < children1.length; i++) {
    if (!areNodesEquivalent(children1[i], children2[i])) {
      return false;
    }
  }

  return true;
};

class Explorer {
  private tree: Node | null;

  constructor(
    tree: Node | string = "",
    syntaxKind:
      | SyntaxKind.TypeReference
      | SyntaxKind.MethodDeclaration
      | SyntaxKind.Unknown = SyntaxKind.Unknown,
  ) {
    this.tree = typeof tree === "string" ? createTree(tree, syntaxKind) : tree;
  }

  isEmpty(): boolean {
    return this.tree === null;
  }

  toString(): string {
    return this.tree ? this.tree.getText() : "no ast";
  }

  // Compares the current tree with another tree, ignoring semicolons and whitespace
  matches(other: string | Explorer): boolean {
    let otherExplorer: Explorer;

    if (typeof other === "string") {
      // If current node is a MethodDeclaration, wrap the string in a class for proper parsing
      if (this.tree && isMethodDeclaration(this.tree)) {
        otherExplorer = new Explorer(other, SyntaxKind.MethodDeclaration);
      } else {
        otherExplorer = new Explorer(other);
      }
    } else {
      otherExplorer = other;
    }

    return areNodesEquivalent(this.tree, otherExplorer.tree);
  }

  // Finds all nodes of a specific kind in the tree. If `startsAtMember` is
  // true, the search will look inside member lists (e.g. class/interface/type
  // literal members) instead of at the top-level statements.
  getAll(kind: SyntaxKind, startsAtMember: boolean = false): Explorer[] {
    if (!this.tree) {
      return [];
    }

    const nodes: Explorer[] = [];

    function pushMembers(tree: Node): void {
      const members = findMembers(tree);
      if (members) {
        members.forEach((m) => {
          if (m.kind === kind) {
            nodes.push(new Explorer(m));
          }
        });
      }
    }

    // Check if the tree is a SourceFile or a Block (for function/method bodies)
    if (isSourceFile(this.tree) || isBlock(this.tree)) {
      // Iterate through the statements of the SourceFile
      this.tree.statements.forEach((statement) => {
        if (!startsAtMember && statement.kind === kind) {
          nodes.push(new Explorer(statement));
        }

        if (startsAtMember) {
          pushMembers(statement);
        }
      });
    }

    if (startsAtMember) {
      pushMembers(this.tree);
    }

    return nodes;
  }

  // Finds all variable statements
  getVariables(): { [key: string]: Explorer } {
    const variables = this.getAll(SyntaxKind.VariableStatement);
    const result: { [key: string]: Explorer } = {};
    variables.forEach((variable) => {
      const declaration = (variable.tree as VariableStatement).declarationList
        .declarations[0];
      const name = (declaration.name as Identifier).text;
      result[name] = variable;
    });
    return result;
  }

  // Retrieves the type annotation of the current node if it exists, otherwise returns an empty Explorer
  getAnnotation(): Explorer {
    if (this.isEmpty()) {
      return new Explorer();
    }

    const node = this.tree!;

    // Handle VariableStatement (variable declarations)
    if (isVariableStatement(node)) {
      const declaration = node.declarationList.declarations[0];
      if (declaration.type) {
        return new Explorer(declaration.type);
      }
    }

    // Handle Parameter (function/method parameters), PropertyDeclaration (class
    // properties), PropertySignature (interface/type literal properties), and
    // TypeAliasDeclaration (the type itself)
    if (
      isParameter(node) ||
      isPropertyDeclaration(node) ||
      isPropertySignature(node) ||
      isTypeAliasDeclaration(node)
    ) {
      if (node.type) {
        return new Explorer(node.type);
      }
    }

    return new Explorer();
  }

  // Checks if the current node has a type annotation that matches the provided annotation string
  hasAnnotation(annotation: string): boolean {
    const currentAnnotation = this.getAnnotation();
    if (currentAnnotation.isEmpty()) {
      return false;
    }

    const annotationNode = createTree(annotation, SyntaxKind.TypeReference);
    if (annotationNode === null) {
      return false;
    }

    const annotationExplorer = new Explorer(annotationNode);
    return currentAnnotation.matches(annotationExplorer);
  }

  // Finds all functions in the current tree. If withVariables is true, it includes function expressions and arrow functions assigned to variables
  getFunctions(withVariables: boolean = false): { [key: string]: Explorer } {
    const result: { [key: string]: Explorer } = {};
    const functionDeclarations = this.getAll(SyntaxKind.FunctionDeclaration);
    functionDeclarations.forEach((func) => {
      const name = (func.tree as FunctionDeclaration).name?.text;
      if (name) {
        result[name] = func;
      }
    });

    if (withVariables) {
      const functionVariables = this.getAll(
        SyntaxKind.VariableStatement,
      ).filter((v) => {
        const declaration = (v.tree as VariableStatement).declarationList
          .declarations[0];
        if (!declaration.initializer) return false;

        return (
          isArrowFunction(declaration.initializer) ||
          isFunctionExpression(declaration.initializer)
        );
      });
      functionVariables.forEach((v) => {
        const declaration = (v.tree as VariableStatement).declarationList
          .declarations[0];
        const name = (declaration.name as Identifier).text;
        result[name] = v;
      });
    }

    return result;
  }

  // Retrieves the body of a function, method, or other construct that has a body
  getBody(): Explorer {
    if (!this.tree) {
      return new Explorer();
    }

    let body: Node | undefined;

    // Handle FunctionDeclaration, MethodDeclaration, FunctionExpression, ArrowFunction
    if (
      isFunctionDeclaration(this.tree) ||
      isMethodDeclaration(this.tree) ||
      isFunctionExpression(this.tree) ||
      isArrowFunction(this.tree)
    ) {
      body = this.tree.body;
    }

    // Handle VariableStatement with function initializer
    if (isVariableStatement(this.tree)) {
      const { initializer } = this.tree.declarationList.declarations[0];
      if (
        initializer &&
        (isArrowFunction(initializer) || isFunctionExpression(initializer))
      ) {
        body = initializer.body;
      }
    }

    if (body) {
      return new Explorer(body);
    }

    return new Explorer();
  }

  // Checks if a function (function declaration, method, arrow function, or function expression) has a specific return type annotation
  hasReturnAnnotation(annotation: string): boolean {
    if (!this.tree) {
      return false;
    }

    let functionNode:
      | FunctionDeclaration
      | MethodDeclaration
      | ArrowFunction
      | FunctionExpression
      | null = null;

    // Handle FunctionDeclaration, MethodDeclaration, ArrowFunction and FunctionExpression directly
    if (
      isFunctionDeclaration(this.tree) ||
      isMethodDeclaration(this.tree) ||
      isArrowFunction(this.tree) ||
      isFunctionExpression(this.tree)
    ) {
      functionNode = this.tree;
    }

    // Handle VariableStatement with function initializer
    if (isVariableStatement(this.tree)) {
      const { initializer } = this.tree.declarationList.declarations[0];
      if (
        initializer &&
        (isArrowFunction(initializer) || isFunctionExpression(initializer))
      ) {
        functionNode = initializer;
      }
    }

    // Check return type if we found a function node
    if (functionNode?.type) {
      const returnAnnotation = new Explorer(functionNode.type);
      const explorerAnnotation = new Explorer(
        annotation,
        SyntaxKind.TypeReference,
      );
      return returnAnnotation.matches(explorerAnnotation);
    }

    return false;
  }

  // Retrieves the parameters of a function, whether it's a function declaration or a variable statement initialized with a function
  getParameters(): Explorer[] {
    if (!this.tree) {
      return [];
    }

    if (isFunctionDeclaration(this.tree)) {
      return this.tree.parameters.map((param) => new Explorer(param));
    }

    if (isVariableStatement(this.tree)) {
      const { initializer } = this.tree.declarationList.declarations[0];
      if (
        (initializer && isArrowFunction(initializer)) ||
        (initializer && isFunctionExpression(initializer))
      ) {
        return initializer.parameters.map((param) => new Explorer(param));
      }
    }

    return [];
  }

  // Finds all type alias declarations in the current tree
  getTypes(): { [key: string]: Explorer } {
    const typeDeclarations = this.getAll(SyntaxKind.TypeAliasDeclaration);
    const result: { [key: string]: Explorer } = {};
    typeDeclarations.forEach((t) => {
      const name = (t.tree as TypeAliasDeclaration).name.text;
      result[name] = t;
    });
    return result;
  }

  // Finds all interface declarations in the current tree
  getInterfaces(): { [key: string]: Explorer } {
    const interfaceDeclarations = this.getAll(SyntaxKind.InterfaceDeclaration);
    const result: { [key: string]: Explorer } = {};
    interfaceDeclarations.forEach((i) => {
      const name = (i.tree as InterfaceDeclaration).name.text;
      result[name] = i;
    });
    return result;
  }

  // Finds all class declarations in the current tree
  getClasses(): { [key: string]: Explorer } {
    const classDeclarations = this.getAll(SyntaxKind.ClassDeclaration);
    const result: { [key: string]: Explorer } = {};
    classDeclarations.forEach((c) => {
      const name = (c.tree as ClassDeclaration).name?.text;
      if (name) {
        result[name] = c;
      }
    });
    return result;
  }

  // Finds all method declarations within a class
  getMethods(): { [key: string]: Explorer } {
    const result: { [key: string]: Explorer } = {};
    if (this.tree && isClassDeclaration(this.tree)) {
      this.getAll(SyntaxKind.MethodDeclaration, true).forEach((member) => {
        const method = member.tree as MethodDeclaration;
        const methodName = (method.name as Identifier).text;
        result[methodName] = member;
      });
    }

    return result;
  }

  // Finds all properties in a class
  getClassProps(): { [key: string]: Explorer } {
    if (!this.tree || !isClassDeclaration(this.tree)) {
      return {};
    }

    const result: { [key: string]: Explorer } = {};

    this.getAll(SyntaxKind.PropertyDeclaration, true).forEach((property) => {
      const prop = property.tree as PropertyDeclaration;
      const name = (prop.name as Identifier).text;
      result[name] = new Explorer(prop);
    });

    return result;
  }

  getTypeProps(): { [key: string]: Explorer } {
    if (!this.tree) {
      return {};
    }

    const result: { [key: string]: Explorer } = {};
    this.getAll(SyntaxKind.PropertySignature, true).forEach((member) => {
      const prop = member.tree as PropertyDeclaration;
      const name = (prop.name as Identifier).text;
      result[name] = member;
    });

    return result;
  }

  // Checks if a property with the given name (and optionally type and optionality) exists in the current tree, which can be an interface, type literal, or variable statement with a type literal annotation
  hasTypeProp(name: string, type?: string, isOptional?: boolean): boolean {
    if (!this.tree) {
      return false;
    }

    const members = findMembers(this.tree);

    if (!members) {
      return false;
    }

    const member = Array.from(members).find((m) => {
      if (m.name && isIdentifier(m.name)) {
        return m.name.text === name;
      }

      return false;
    });

    if (!member) {
      return false;
    }

    // Check type if specified
    if (type !== undefined) {
      if (isPropertySignature(member)) {
        if (!member.type) {
          return false;
        }

        const memberType = new Explorer(member.type);
        if (!memberType.matches(new Explorer(type, SyntaxKind.TypeReference))) {
          return false;
        }
      } else {
        return false;
      }
    }

    // Check optionality if specified
    if (isOptional !== undefined) {
      if (isPropertySignature(member)) {
        const memberIsOptional = member.questionToken !== undefined;
        if (memberIsOptional !== isOptional) {
          return false;
        }
      }
    }

    return true;
  }

  // Checks if all specified properties exist in the current tree, which can be an interface, type alias, type literal, or variable statement with a type literal annotation
  hasTypeProps(props: TypeProp | TypeProp[]): boolean {
    if (!this.tree) {
      return false;
    }

    if (
      !isInterfaceDeclaration(this.tree) &&
      !isTypeLiteralNode(this.tree) &&
      !isTypeAliasDeclaration(this.tree) &&
      !isVariableStatement(this.tree)
    ) {
      return false;
    }

    if (!Array.isArray(props)) {
      props = [props];
    }

    const members = this.getTypeProps();
    if (Object.keys(members).length === 0 || props.length === 0) {
      return false;
    }

    function hasProp(prop: TypeProp): boolean {
      const member = members[prop.name];
      if (!member) {
        return false;
      }

      // Check type if specified
      if (prop.type !== undefined) {
        if (!member.tree || !isPropertySignature(member.tree)) {
          return false;
        }

        const memberType = new Explorer(member.tree.type);
        if (
          !memberType.matches(new Explorer(prop.type, SyntaxKind.TypeReference))
        ) {
          return false;
        }
      }

      // Check optionality if specified
      if (prop.isOptional !== undefined) {
        if (!member.tree || !isPropertySignature(member.tree)) {
          return false;
        }

        const memberIsOptional = member.tree.questionToken !== undefined;
        if (memberIsOptional !== prop.isOptional) {
          return false;
        }
      }

      return true;
    }

    return props.every((prop) => hasProp(prop));
  }
}

export { Explorer };
