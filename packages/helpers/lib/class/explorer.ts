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
    isArrowFunction(tree)
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

// Check if a node is a literal expression (numeric, string, boolean, null, etc.)
function isLiteralExpression(node: Node): boolean {
  return (
    node.kind === SyntaxKind.NumericLiteral ||
    node.kind === SyntaxKind.StringLiteral ||
    node.kind === SyntaxKind.NoSubstitutionTemplateLiteral ||
    node.kind === SyntaxKind.TrueKeyword ||
    node.kind === SyntaxKind.FalseKeyword ||
    node.kind === SyntaxKind.NullKeyword ||
    node.kind === SyntaxKind.UndefinedKeyword
  );
}

type SyntaxKinds =
  | SyntaxKind.TypeReference
  | SyntaxKind.MethodDeclaration
  | SyntaxKind.Parameter
  | SyntaxKind.PropertyDeclaration
  | SyntaxKind.ObjectLiteralExpression
  | SyntaxKind.ArrayLiteralExpression
  | SyntaxKind.NumericLiteral
  | SyntaxKind.Unknown;

function createTree(
  code: string,
  kind: SyntaxKinds = SyntaxKind.Unknown,
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

  if (kind === SyntaxKind.Parameter) {
    sourceFile = createSource(`function _(${code}) {}`);
    const funcDecl = sourceFile.statements[0] as FunctionDeclaration;
    if (isFunctionDeclaration(funcDecl) && funcDecl.parameters.length > 0) {
      return funcDecl.parameters[0];
    }

    return null;
  }

  if (kind === SyntaxKind.PropertyDeclaration) {
    sourceFile = createSource(`class _ { ${code} }`);
    const classDecl = sourceFile.statements[0] as ClassDeclaration;
    const propDecl = classDecl.members.find((member) =>
      isPropertyDeclaration(member),
    );
    return propDecl || null;
  }

  if (kind === SyntaxKind.TypeReference) {
    sourceFile = createSource(`let _: ${code};`);
    const varStatement = sourceFile.statements[0] as VariableStatement;
    const declaration = varStatement.declarationList.declarations[0];
    return declaration.type || null;
  }

  if (
    kind === SyntaxKind.ObjectLiteralExpression ||
    kind === SyntaxKind.ArrayLiteralExpression ||
    kind === SyntaxKind.NumericLiteral
  ) {
    sourceFile = createSource(`const _ = ${code};`);
    const varStatement = sourceFile.statements[0] as VariableStatement;
    const declaration = varStatement.declarationList.declarations[0];
    return declaration.initializer || null;
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

  constructor(
    tree: Node | string = "",
    syntaxKind: SyntaxKinds = SyntaxKind.Unknown,
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
      // Handle empty case: both are empty
      if (!this.tree && !other.trim()) {
        return true;
      }

      if (!this.tree) {
        return false;
      }

      // If current node is a Parameter, wrap the string in a function parameter for proper parsing
      if (isParameter(this.tree)) {
        otherExplorer = new Explorer(other, SyntaxKind.Parameter);
      }
      // If current node is a PropertyDeclaration, wrap the string in a class for proper parsing
      else if (isPropertyDeclaration(this.tree)) {
        otherExplorer = new Explorer(other, SyntaxKind.PropertyDeclaration);
      }
      // If current node is a MethodDeclaration, wrap the string in a class for proper parsing
      else if (isMethodDeclaration(this.tree)) {
        otherExplorer = new Explorer(other, SyntaxKind.MethodDeclaration);
      }
      // If current node is an ObjectLiteralExpression, ArrayLiteralExpression, or LiteralExpression, wrap the string in a variable declaration for proper parsing
      else if (
        isObjectLiteralExpression(this.tree) ||
        isArrayLiteralExpression(this.tree) ||
        isLiteralExpression(this.tree)
      ) {
        otherExplorer = new Explorer(other, SyntaxKind.ObjectLiteralExpression);
      } else {
        otherExplorer = new Explorer(other);
      }
    } else {
      otherExplorer = other;
    }

    return areNodesEquivalent(this.tree, otherExplorer.tree);
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
        const typeExplorer = new Explorer(typeString, SyntaxKind.TypeReference);
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
            // Use ObjectLiteralExpression as the context to properly wrap expressions like function calls
            const valueExplorer = new Explorer(
              value,
              SyntaxKind.ObjectLiteralExpression,
            );
            return returnExplorer.matches(valueExplorer);
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

  // Finds all properties in a class
  getClassProps(): { [key: string]: Explorer } {
    if (!this.tree || !isClassDeclaration(this.tree)) {
      return {};
    }

    const result: { [key: string]: Explorer } = {};

    this.getAll(SyntaxKind.PropertyDeclaration).forEach((property) => {
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
        const castTypeExplorer = new Explorer(
          castType,
          SyntaxKind.TypeReference,
        );
        const expectedTypeExplorer = new Explorer(
          expectedType,
          SyntaxKind.TypeReference,
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
}

export { Explorer };
