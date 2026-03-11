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
  isArrayLiteralExpression,
  FunctionExpression,
  InterfaceDeclaration,
  ClassDeclaration,
  MethodDeclaration,
  PropertyDeclaration,
  TypeElement,
  ClassElement,
  ObjectLiteralExpression,
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
  isModuleBlock,
  isCaseOrDefaultClause,
  isObjectLiteralExpression,
  isPropertyAssignment,
  isAsExpression,
  isUnionTypeNode,
  Statement,
  ReturnStatement,
  isBinaryExpression,
  isPropertyAccessExpression,
  isExpressionStatement,
  isConstructorDeclaration,
  isNonNullExpression,
  isExpression,
  isTypeReferenceNode,
  isIntersectionTypeNode,
  isArrayTypeNode,
  isTupleTypeNode,
  isFunctionTypeNode,
  isLiteralTypeNode,
  isParenthesizedTypeNode,
  isConditionalTypeNode,
  isMappedTypeNode,
  isTemplateLiteralTypeNode,
  isIndexedAccessTypeNode,
  isTypeOperatorNode,
  isRestTypeNode,
  isOptionalTypeNode,
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

function findMembers(tree: Node): ReadonlyArray<TypeElement | ClassElement> {
  // Handle VariableStatement with TypeLiteral annotation
  if (isVariableStatement(tree)) {
    const declaration = tree.declarationList.declarations[0];
    return declaration.type && isTypeLiteralNode(declaration.type)
      ? declaration.type.members
      : [];
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
    return isTypeLiteralNode(tree.type) ? tree.type.members : [];
  }

  // Handle PropertySignature, PropertyDeclaration and Parameter: if it has a type literal annotation, return its members
  if (
    isPropertySignature(tree) ||
    isPropertyDeclaration(tree) ||
    isParameter(tree)
  ) {
    return tree.type && isTypeLiteralNode(tree.type) ? tree.type.members : [];
  }

  return [];
}

function findStatements(tree: Node): ReadonlyArray<Statement> {
  // Handle SourceFile, Block, ModuleBlock, and CaseOrDefaultClause directly
  if (
    isSourceFile(tree) ||
    isBlock(tree) ||
    isModuleBlock(tree) ||
    isCaseOrDefaultClause(tree)
  ) {
    return tree.statements;
  }

  return [];
}

// Retrieves the body of a function, method, or other construct that has a body
function getBody(tree: Node): Node | undefined {
  // Handle FunctionDeclaration, MethodDeclaration, FunctionExpression, ArrowFunction
  if (
    isFunctionDeclaration(tree) ||
    isMethodDeclaration(tree) ||
    isFunctionExpression(tree) ||
    isArrowFunction(tree) ||
    isConstructorDeclaration(tree)
  ) {
    return tree.body;
  }

  // Handle VariableStatement with function initializer
  if (isVariableStatement(tree)) {
    const { initializer } = tree.declarationList.declarations[0];
    if (
      initializer &&
      (isArrowFunction(initializer) || isFunctionExpression(initializer))
    ) {
      return initializer.body;
    }
  }
}

type ParseContext =
  | "source"
  | "method"
  | "constructor"
  | "parameter"
  | "propertyDeclaration"
  | "typeReference"
  | "expression";

const CONTEXT_GUARDS: ReadonlyArray<
  [ParseContext, ReadonlyArray<(node: Node) => boolean>]
> = [
  ["constructor", [isConstructorDeclaration]],
  ["method", [isMethodDeclaration]],
  ["propertyDeclaration", [isPropertyDeclaration]],
  ["parameter", [isParameter]],
  // Type nodes — getAnnotation() / hasReturnAnnotation() return new Explorer(node.type).
  // Without these, matches() falls through to "source" and comparison always fails.
  [
    "typeReference",
    [
      isTypeReferenceNode,
      isUnionTypeNode,
      isIntersectionTypeNode,
      isArrayTypeNode,
      isTupleTypeNode,
      isFunctionTypeNode,
      isTypeLiteralNode,
      isLiteralTypeNode,
      isParenthesizedTypeNode,
      isConditionalTypeNode,
      isMappedTypeNode,
      isTemplateLiteralTypeNode,
      isIndexedAccessTypeNode,
      isTypeOperatorNode,
      isRestTypeNode,
      isOptionalTypeNode,
    ],
  ],
  [
    "expression",
    [
      isObjectLiteralExpression,
      isArrayLiteralExpression,
      isNonNullExpression,
      isAsExpression,
      isPropertyAccessExpression,
      isBinaryExpression,
      isArrowFunction,
      isFunctionExpression,
      // Catch-all for remaining expression kinds (CallExpression, NewExpression, etc.)
      isExpression,
    ],
  ],
];

function inferContext(node: Node): ParseContext {
  for (const [context, guards] of CONTEXT_GUARDS) {
    if (guards.some((guard) => guard(node))) {
      return context;
    }
  }

  return "source";
}

function createTree(code: string, context: ParseContext): Node | null {
  if (!code.trim()) {
    return null;
  }

  switch (context) {
    case "method": {
      const sf = createSource(`class _ { ${code} }`);
      const classDecl = sf.statements[0] as ClassDeclaration;
      return classDecl.members.find(isMethodDeclaration) ?? null;
    }

    case "constructor": {
      const sf = createSource(`class _ { ${code} }`);
      const classDecl = sf.statements[0] as ClassDeclaration;
      return classDecl.members.find(isConstructorDeclaration) ?? null;
    }

    case "parameter": {
      const sf = createSource(`function _(${code}) {}`);
      const funcDecl = sf.statements[0] as FunctionDeclaration;
      return funcDecl.parameters[0] ?? null;
    }

    case "propertyDeclaration": {
      const sf = createSource(`class _ { ${code} }`);
      const classDecl = sf.statements[0] as ClassDeclaration;
      return classDecl.members.find(isPropertyDeclaration) ?? null;
    }

    case "typeReference": {
      const sf = createSource(`let _: ${code};`);
      const declaration = (sf.statements[0] as VariableStatement)
        .declarationList.declarations[0];
      return declaration.type ?? null;
    }

    case "expression": {
      const sf = createSource(`const _ = ${code};`);
      const declaration = (sf.statements[0] as VariableStatement)
        .declarationList.declarations[0];
      return declaration.initializer ?? null;
    }

    case "source":
      return createSource(code);

    default:
      return null;
  }
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
  const unwrap = (node: Node): Node =>
    isSourceFile(node) && node.statements.length === 1
      ? node.statements[0]
      : node;

  node1 = unwrap(node1);
  node2 = unwrap(node2);

  if (node1.kind !== node2.kind) return false;

  const children1 = removeSemicolons(node1.getChildren());
  const children2 = removeSemicolons(node2.getChildren());

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
  private context: ParseContext;

  constructor(tree: Node | string = "", context: ParseContext = "source") {
    if (typeof tree === "string") {
      this.tree = createTree(tree, context);
      this.context = context;
    } else {
      this.tree = tree;
      this.context = inferContext(tree);
    }
  }

  isEmpty(): boolean {
    return this.tree === null;
  }

  toString(): string {
    return this.tree ? this.tree.getText() : "no ast";
  }

  // Compares the current tree with another tree, ignoring semicolons and whitespace
  matches(other: string | Explorer): boolean {
    if (typeof other === "string") {
      // Handle empty case: both are empty
      if (!this.tree && !other.trim()) {
        return true;
      }

      if (!this.tree) {
        return false;
      }

      // Reuse the stored context so the RHS string is wrapped the same way
      // this node was parsed — no manual if/else chain needed
      return areNodesEquivalent(this.tree, createTree(other, this.context));
    }

    return areNodesEquivalent(this.tree, other.tree);
  }

  // Finds all nodes of a specific kind in the current scope.
  getAll(kind: SyntaxKind): Explorer[] {
    if (!this.tree) {
      return [];
    }

    const body = getBody(this.tree);
    // If the body exists, it must be the scope, otherwise we search the current
    // tree (e.g. for class members)
    const scope = body ?? this.tree;

    const members = findMembers(scope);
    const statements = findStatements(scope);

    const explorers = [...members, ...statements]
      .filter((node) => node.kind === kind)
      .map((node) => new Explorer(node));

    return explorers;
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

  // Retrieves the assigned value of a variable, property, parameter, or property assignment
  getValue(): Explorer {
    if (this.isEmpty()) {
      return new Explorer();
    }

    const node = this.tree!;

    // Handle VariableStatement
    if (isVariableStatement(node)) {
      const { initializer } = node.declarationList.declarations[0];
      return initializer ? new Explorer(initializer) : new Explorer();
    }

    // Handle PropertyDeclaration (class properties), PropertySignature (interface/type properties), and Parameter (function/method parameters)
    if (isPropertyDeclaration(node) || isParameter(node)) {
      return node.initializer ? new Explorer(node.initializer) : new Explorer();
    }

    // Handle PropertyAssignment (object literal properties)
    if (isPropertyAssignment(node)) {
      return node.initializer ? new Explorer(node.initializer) : new Explorer();
    }

    return new Explorer();
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

  // Checks if the current node has a union type annotation that includes all specified types ignoring order
  isUnionOf(types: string[]): boolean {
    const currentAnnotation = this.getAnnotation();
    if (currentAnnotation.isEmpty()) {
      return false;
    }

    const annotationNode = currentAnnotation.tree;
    if (!annotationNode || !isUnionTypeNode(annotationNode)) {
      return false;
    }

    // Extract the current union type members
    const currentMembers = annotationNode.types;
    if (currentMembers.length !== types.length) {
      return false;
    }

    // Check if all current members match some member in the provided types array
    return currentMembers.every((currentMember) =>
      types.some((typeString) => {
        const typeExplorer = new Explorer(typeString, "typeReference");
        if (typeExplorer.isEmpty()) {
          return false;
        }

        return currentMember.getText() === typeExplorer.tree?.getText();
      }),
    );
  }

  // Checks if the current node has a type annotation that matches the provided annotation string
  hasAnnotation(annotation: string): boolean {
    const currentAnnotation = this.getAnnotation();
    if (currentAnnotation.isEmpty()) {
      return false;
    }

    const annotationExplorer = new Explorer(annotation, "typeReference");
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
      const explorerAnnotation = new Explorer(annotation, "typeReference");
      return returnAnnotation.matches(explorerAnnotation);
    }

    return false;
  }

  // Retrieves the parameters of a function or method
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

    if (isMethodDeclaration(this.tree)) {
      return this.tree.parameters.map((param) => new Explorer(param));
    }

    return [];
  }

  // Checks the return value of a function, method, or arrow function against a provided string representation of the expected return value
  hasReturn(value: string): boolean {
    if (this.isEmpty()) {
      return false;
    }

    const node = this.tree!;

    const body = getBody(node);
    if (!body) {
      return false;
    }

    // If body is a Block, get its statements to find return statements at outer scope
    if (isBlock(body)) {
      const statements = findStatements(body);
      for (const statement of statements) {
        if (statement.kind === SyntaxKind.ReturnStatement) {
          const returnStmt = statement as ReturnStatement;
          if (returnStmt.expression) {
            const returnExplorer = new Explorer(returnStmt.expression);
            return returnExplorer.matches(value);
          }
        }
      }

      return false;
    }

    // If body is an expression (arrow function without braces), compare directly
    const bodyExplorer = new Explorer(body);
    return bodyExplorer.matches(value);
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
      this.getAll(SyntaxKind.MethodDeclaration).forEach((member) => {
        const method = member.tree as MethodDeclaration;
        const methodName = (method.name as Identifier).text;
        result[methodName] = member;
      });
    }

    return result;
  }

  // Finds and returns the constructor of a class as an Explorer object
  getConstructor(): Explorer | null {
    if (!this.tree || !isClassDeclaration(this.tree)) {
      return null;
    }

    const constructors = this.getAll(SyntaxKind.Constructor);
    return constructors.length > 0 ? constructors[0] : null;
  }

  // Finds all properties in a class
  getClassProps(includeConstructor = false): { [key: string]: Explorer } {
    if (!this.tree || !isClassDeclaration(this.tree)) {
      return {};
    }

    const result: { [key: string]: Explorer } = {};

    this.getAll(SyntaxKind.PropertyDeclaration).forEach((property) => {
      const prop = property.tree as PropertyDeclaration;
      const name = (prop.name as Identifier).text;
      result[name] = new Explorer(prop);
    });

    if (includeConstructor) {
      const constructor = this.getConstructor();
      if (constructor && !constructor.isEmpty()) {
        const constructorNode = constructor.tree as Node;
        const body = getBody(constructorNode);
        if (body && isBlock(body)) {
          body.statements.forEach((stmt: Node) => {
            if (isExpressionStatement(stmt)) {
              const expr = stmt.expression;
              // Check for property assignments: this.propertyName = value
              if (
                isBinaryExpression(expr) &&
                isPropertyAccessExpression(expr.left)
              ) {
                const propAccess = expr.left;
                // Ensure it's accessing a property on 'this'
                if (
                  propAccess.expression.kind === SyntaxKind.ThisKeyword &&
                  isIdentifier(propAccess.name)
                ) {
                  const propName = propAccess.name.text;
                  // Only add if not already defined as a PropertyDeclaration
                  if (!(propName in result)) {
                    result[propName] = new Explorer(propAccess);
                  }
                }
              }
            }
          });
        }
      }
    }

    return result;
  }

  getTypeProps(): { [key: string]: Explorer } {
    if (!this.tree) {
      return {};
    }

    const result: { [key: string]: Explorer } = {};
    this.getAll(SyntaxKind.PropertySignature).forEach((member) => {
      const prop = member.tree as PropertyDeclaration;
      const name = (prop.name as Identifier).text;
      result[name] = member;
    });

    return result;
  }

  // Finds all properties in an object literal and returns them as Explorer instances
  getObjectProps(): { [key: string]: Explorer } {
    if (!this.tree) {
      return {};
    }

    let objectLiteral: ObjectLiteralExpression | undefined;

    // If the current tree is an object literal, use it directly
    if (isObjectLiteralExpression(this.tree)) {
      objectLiteral = this.tree;
    }

    // If it's a variable statement with an object literal initializer, get the object
    if (isVariableStatement(this.tree)) {
      const { initializer } = this.tree.declarationList.declarations[0];
      if (initializer && isObjectLiteralExpression(initializer)) {
        objectLiteral = initializer;
      }
    }

    if (!objectLiteral) {
      return {};
    }

    const result: { [key: string]: Explorer } = {};
    objectLiteral.properties.forEach((property) => {
      if (isPropertyAssignment(property)) {
        if (property.name && isIdentifier(property.name)) {
          const name = property.name.text;
          result[name] = new Explorer(property);
        }
      }
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

    const member = members.find((m) => {
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
        if (!memberType.matches(new Explorer(type, "typeReference"))) {
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
        if (!memberType.matches(new Explorer(prop.type, "typeReference"))) {
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

    return props.every(hasProp);
  }

  // Checks if the current node is a type assertion (cast using 'as')
  // Optionally verify the cast type matches the provided type string
  hasCast(expectedType?: string): boolean {
    if (this.isEmpty()) {
      return false;
    }

    const node = this.tree!;

    // Check if the node is an AsExpression (type assertion with 'as' keyword)
    if (isAsExpression(node)) {
      if (expectedType === undefined) {
        return true;
      }

      // Check if the cast type matches the expected type
      const castType = node.type;
      if (castType) {
        const castTypeExplorer = new Explorer(castType);
        const expectedTypeExplorer = new Explorer(
          expectedType,
          "typeReference",
        );
        return castTypeExplorer.matches(expectedTypeExplorer);
      }

      return false;
    }

    return false;
  }

  // Checks if a class or interface extends the specified base class or interface(s)
  doesExtend(basesToCheck: string | string[]): boolean {
    if (!this.tree) {
      return false;
    }

    const node = this.tree;
    const baseClause =
      (isClassDeclaration(node) || isInterfaceDeclaration(node)) &&
      node.heritageClauses
        ? node.heritageClauses
        : null;

    if (!baseClause) {
      return false;
    }

    if (!Array.isArray(basesToCheck)) {
      basesToCheck = [basesToCheck];
    }

    // Check each heritage clause for extends
    for (const clause of baseClause) {
      if (clause.token !== SyntaxKind.ExtendsKeyword) {
        continue;
      }

      const typeNames = clause.types.reduce((names: string[], type) => {
        // Get the type name - handle simple identifiers and qualified names
        if (isIdentifier(type.expression)) {
          names.push(type.expression.text);
        } else if (type.expression.kind === SyntaxKind.QualifiedName) {
          // For qualified names like "namespace.ClassName", get the full text
          names.push(type.expression.getText());
        }

        return names;
      }, []);

      // Check if all requested bases are in the extends clause
      if (basesToCheck.every((b) => typeNames.includes(b))) {
        return true;
      }
    }

    return false;
  }

  // Checks if a class implements the specified interface(s)
  doesImplement(basesToCheck: string | string[]): boolean {
    if (!this.tree) {
      return false;
    }

    const node = this.tree;
    const baseClause =
      isClassDeclaration(node) && node.heritageClauses
        ? node.heritageClauses
        : null;

    if (!baseClause) {
      return false;
    }

    if (!Array.isArray(basesToCheck)) {
      basesToCheck = [basesToCheck];
    }

    // Check each heritage clause for implements
    for (const clause of baseClause) {
      if (clause.token !== SyntaxKind.ImplementsKeyword) {
        continue;
      }

      const typeNames = clause.types.reduce((names: string[], type) => {
        // Get the type name - handle simple identifiers and qualified names
        if (isIdentifier(type.expression)) {
          names.push(type.expression.text);
        } else if (type.expression.kind === SyntaxKind.QualifiedName) {
          // For qualified names like "namespace.ClassName", get the full text
          names.push(type.expression.getText());
        }

        return names;
      }, []);

      // Check if all requested bases are in the implements clause
      if (basesToCheck.every((b) => typeNames.includes(b))) {
        return true;
      }
    }

    return false;
  }

  // Checks if the property has a private modifier
  isPrivate(): boolean {
    if (!this.tree) return false;
    return (
      (this.tree as Node & { modifiers?: Node[] }).modifiers?.some(
        (modifier) => modifier.kind === SyntaxKind.PrivateKeyword,
      ) ?? false
    );
  }

  // Checks if the property has a protected modifier
  isProtected(): boolean {
    if (!this.tree) return false;
    return (
      (this.tree as Node & { modifiers?: Node[] }).modifiers?.some(
        (modifier) => modifier.kind === SyntaxKind.ProtectedKeyword,
      ) ?? false
    );
  }

  // Checks if the property has a public modifier
  isPublic(): boolean {
    if (!this.tree) return false;
    return (
      (this.tree as Node & { modifiers?: Node[] }).modifiers?.some(
        (modifier) => modifier.kind === SyntaxKind.PublicKeyword,
      ) ?? false
    );
  }

  // Checks if the property has a readonly modifier
  isReadOnly(): boolean {
    if (!this.tree) return false;
    return (
      (this.tree as Node & { modifiers?: Node[] }).modifiers?.some(
        (modifier) => modifier.kind === SyntaxKind.ReadonlyKeyword,
      ) ?? false
    );
  }

  // Checks if the expression has a non-null assertion (!)
  hasNonNullAssertion(): boolean {
    if (!this.tree) return false;
    return isNonNullExpression(this.tree);
  }
}

export { Explorer };
