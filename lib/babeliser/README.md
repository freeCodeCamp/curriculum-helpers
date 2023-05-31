# Babeliser

A helper library to parse JavaScript code. Uses `@babel/parser` and `@babel/generator` under the hood.

## API

<details>
  <summary>Code Used:</summary>

```javascript
import z from "z";
import { y } from "y";

const a = 1;
let b = 2;
var c = 3;
console.log(a + b + c);

function add(param1, param2) {
  const tot = param1 + param2;
  let currentWeapon;
  return tot;
}

add(a, b);

async function sub(param1, param2) {
  (() => {
    b++;
  })();
}

await sub(1, 2);

const complexType = {
  a: 1,
  b: [1, 2, "3"],
  c: {
    d: true,
  },
  e: () => {
    const inner = 24;
  },
};

if (complexType.c?.d) {
  complexType.e();
  throw new Error("error");
} else if (complexType.a === a) {
  // Do nothing
} else {
  a++;
}

while (a > 1) {
  for (let i = 0; i < c; i++) {
    switch (i) {
      case 1:
        break;
      default:
        break;
    }
  }
}
```

</details>

```javascript
import { Babeliser } from "babeliser";

const babelisedCode = new Babeliser(codeString);

assert.equal(t.parsedCode.program.body.length, 7);
```

<details>
  <summary><code>getArrowFunctionExpressions</code></summary>

```javascript
assert.equal(t.getArrowFunctionExpressions().length, 2);

const iIFEArrowFunctionExpression = t
  .getArrowFunctionExpressions()
  .find((a) => {
    return a.scope.join() === "global,sub";
  });
assert.exists(iIFEArrowFunctionExpression);
```

</details>

<details>
  <summary><code>getExpressionStatements</code></summary>

```javascript
assert.equal(t.getExpressionStatements().length, 4);

const consoleExpression = t.getExpressionStatements().find((e) => {
  const callExpression = e.expression;
  const memberExpression = callExpression.callee;
  const object = memberExpression.object;
  const property = memberExpression.property;
  return object.name === "console" && property.name === "log";
});

const consoleCallExpression = consoleExpression?.expression;
const binaryExpression = consoleCallExpression.arguments[0];
const binaryExpressionLeft = binaryExpression.left;
const binaryExpressionLeftLeft = binaryExpressionLeft.left;
const binaryExpressionLeftRight = binaryExpressionLeft.right;
const binaryExpressionRight = binaryExpression.right;
assert.equal(binaryExpressionLeftLeft.name, "a");
assert.equal(binaryExpressionLeftRight.name, "b");
assert.equal(binaryExpressionRight.name, "c");

const addExpression = t.getExpressionStatements().find((e) => {
  const callExpression = e.expression;
  const calleeIdentifier = callExpression.callee;
  if (calleeIdentifier.type === "Identifier") {
    return calleeIdentifier.name === "add";
  }
  return false;
});
const addCallExpression = addExpression?.expression;
const addCalleeIdentifier = addCallExpression.callee;
assert.equal(addCalleeIdentifier.name, "add");
const addArguments = addCallExpression.arguments;
const addArgOneIdentifier = addArguments[0];
assert.equal(addArgOneIdentifier.name, "a");
const addArgTwoIdentifier = addArguments[1];
assert.equal(addArgTwoIdentifier.name, "b");
```

</details>

<details>
  <summary><code>getFunctionDeclarations</code></summary>

```javascript
assert.equal(t.getFunctionDeclarations().length, 2);

const addFunction = t.getFunctionDeclarations().find((f) => {
  return f.id?.name === "add";
});
assert.exists(addFunction);
const addFunctionParams = addFunction.params;
assert.equal(addFunctionParams.length, 2);
const addFunctionParamOne = addFunctionParams[0];
assert.equal(addFunctionParamOne.name, "param1");
const addFunctionParamTwo = addFunctionParams[1];
assert.equal(addFunctionParamTwo.name, "param2");

const totVariable = addFunction.body.body[0];
const totVariableDeclarator = totVariable.declarations[0];
const totIdentifier = totVariableDeclarator.id;
assert.equal(totIdentifier.name, "tot");
const totBinaryExpression = totVariableDeclarator.init;
const totBinaryLeftIdentifier = totBinaryExpression.left;
assert.equal(totBinaryLeftIdentifier.name, "param1");
const totBinaryRightIdentifier = totBinaryExpression.right;
assert.equal(totBinaryRightIdentifier.name, "param2");

const returnStatement = addFunction.body.body.find((b) => {
  return b.type === "ReturnStatement";
});
const returnStatementArgument = returnStatement.argument;
assert.equal(returnStatementArgument.name, "tot");

const subFunctionDeclaration = t.getFunctionDeclarations().find((f) => {
  return f.id?.name === "sub";
});
assert.equal(subFunctionDeclaration.async, true);
```

</details>

<details>
  <summary><code>getImportDeclarations</code></summary>

```javascript
assert.equal(t.getImportDeclarations().length, 2);

const zImportDeclaration = t.getImportDeclarations().find((i) => {
  return i.specifiers[0].local.name === "z";
});
const zImportDefaultSpecifier = zImportDeclaration.specifiers[0];
const zSource = zImportDeclaration.source;
assert.equal(zSource.value, "z");

const yImportDeclaration = t.getImportDeclarations().find((i) => {
  return i.specifiers[0].local.name === "y";
});
const yImportSpecifier = yImportDeclaration.specifiers[0];
const yIdentifierLocal = yImportSpecifier.local;
const yIdentifierImported = yImportSpecifier.imported;
assert.equal(yIdentifierLocal.name, "y");
assert.equal(yIdentifierImported.name, "y");
const ySource = yImportDeclaration.source;
assert.equal(ySource.value, "y");
```

</details>

<details>
  <summary><code>getType</code></summary>

```javascript
const bUpdateExpression = t.getType("UpdateExpression").pop();
assert.equal(bUpdateExpression.operator, "++");
assert.equal(bUpdateExpression.scope.join(), "global,sub");
const bUpdateExpressionArgument = bUpdateExpression.argument;
assert.equal(bUpdateExpressionArgument.name, "b");
```

</details>

<details>
  <summary><code>getVariableDeclarations</code></summary>

```javascript
assert.equal(t.getVariableDeclarations().length, 7);
assert.equal(
  t
    .getVariableDeclarations()
    .filter((v) => v.scope.join() === "global,complexType,e").length,
  1
);

const aVariableDeclaration = t.getVariableDeclarations().find((v) => {
  const variableDeclarator = v.declarations[0];
  const identifier = variableDeclarator.id;
  return identifier.name === "a";
});
assert.equal(aVariableDeclaration.kind, "const");
assert.equal(aVariableDeclaration.scope.join(), "global");
const aNumericLiteral = aVariableDeclaration.declarations[0].init;
assert.equal(aNumericLiteral.value, 1);

const bVariableDeclaration = t.getVariableDeclarations().find((v) => {
  const variableDeclarator = v.declarations[0];
  const identifier = variableDeclarator.id;
  return identifier.name === "b";
});
assert.equal(bVariableDeclaration.kind, "let");
assert.equal(bVariableDeclaration.scope.join(), "global");
const bNumericLiteral = bVariableDeclaration.declarations[0].init;
assert.equal(bNumericLiteral.value, 2);

const cVariableDeclaration = t.getVariableDeclarations().find((v) => {
  const variableDeclarator = v.declarations[0];
  const identifier = variableDeclarator.id;
  return identifier.name === "c";
});
assert.equal(cVariableDeclaration.kind, "var");
assert.equal(cVariableDeclaration.scope.join(), "global");
const cNumericLiteral = cVariableDeclaration.declarations[0].init;
assert.equal(cNumericLiteral.value, 3);

const complexTypeVariableDeclaration = t.getVariableDeclarations().find((v) => {
  const variableDeclarator = v.declarations[0];
  const identifier = variableDeclarator.id;
  return identifier.name === "complexType";
});
assert.equal(complexTypeVariableDeclaration.kind, "const");
assert.equal(complexTypeVariableDeclaration.scope.join(), "global");

const innerVariableDeclaration = t.getVariableDeclarations().find((v) => {
  const variableDeclarator = v.declarations[0];
  const identifier = variableDeclarator.id;
  return identifier.name === "inner";
});
assert.equal(innerVariableDeclaration.kind, "const");
assert.equal(innerVariableDeclaration.scope.join(), "global,complexType,e");
const innerNumericLiteral = innerVariableDeclaration.declarations[0].init;
assert.equal(innerNumericLiteral.value, 24);
```

</details>

<details>
  <summary><code>generateCode</code></summary>

```javascript
const functionDeclaration = t.getFunctionDeclarations().find((c) => {
  return c.id?.name === "add";
});
const blockStatement = functionDeclaration?.body;
const actualCodeString = t.generateCode(blockStatement, {
  compact: true, // Minifies the code without mangling
});
const expectedCodeString = `const tot=param1+param2`;
assert.deepInclude(actualCodeString, expectedCodeString);
```
