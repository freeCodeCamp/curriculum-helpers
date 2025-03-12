# JavaScript

## `Babeliser`

Instantiate a new `Babeliser` with an optional [`options` object](https://babeljs.io/docs/babel-parser#options):

```js
const babelisedCode = new __helpers.Babeliser(code, {
  plugins: ["typescript"],
});
```

### `getVariableDeclarations`

```js
const programProvider = program.provider as AnchorProvider;
```

```javascript
const variableDeclaration = babelisedCode
  .getVariableDeclarations()
  .find((v) => {
    return v.declarations?.[0]?.id?.name === "programProvider";
  });
assert.exists(
  variableDeclaration,
  "A variable named `programProvider` should exist"
);
const tAsExpression = variableDeclaration.declarations?.[0]?.init;
const { object, property } = tAsExpression.expression;
assert.equal(
  object.name,
  "program",
  "The `programProvider` variable should be assigned `program.provider`"
);
assert.equal(
  property.name,
  "provider",
  "The `programProvider` variable should be assigned `program.provider`"
);
const tAnnotation = tAsExpression.typeAnnotation;
assert.equal(
  tAnnotation.typeName.name,
  "AnchorProvider",
  "The `programProvider` variable should be assigned `program.provider as AnchorProvider`"
);
```

### `getFunctionDeclarations`

```js
export function uploadFile() {}
```

```js
const functionDeclaration = babelisedCode
  .getFunctionDeclarations()
  .find((f) => {
    return f.id.name === "uploadFile";
  });
assert.exists(
  functionDeclaration,
  "A function named `uploadFile` should exist"
);

const exports = babelisedCode.getType("ExportNamedDeclaration");
const functionIsExported = exports.some((e) => {
  return (
    e.declaration?.id?.name === "uploadFile" ||
    e.specifiers?.find((s) => s.exported.name === "uploadFile")
  );
});
assert.isTrue(
  functionIsExported,
  "The `uploadFile` function should be exported"
);
```

### `generateCode`

This method is useful when wanting to regenerate code from the AST. This can then be _re-babelised_, and compacted to compare with an expected code string.

```js
it("example with generateCode", () => {
  const [gamePublicKey, _] = PublicKey.findProgramAddressSync(
    [Buffer.from("game"), payer.publicKey.toBuffer(), Buffer.from(gameId)],
    program.programId
  );
});
```

```js
// Limit scope to `it` CallExpression
const callExpression = babelisedCode.getType("CallExpression").find((c) => {
  return c.callee?.name === "it";
});
const blockStatement = callExpression?.arguments?.[1]?.body;
// Take body AST, and generate a compacted string
const actualCodeString = babelisedCode.generateCode(blockStatement, {
  compact: true,
});
const expectedCodeString = `const[gamePublicKey,_]=PublicKey.findProgramAddressSync([Buffer.from('game'),payer.publicKey.toBuffer(),Buffer.from(gameId)],program.programId)`;
assert.deepInclude(actualCodeString, expectedCodeString);
```

### `getExpressionStatements`

```js
export async function createAccount() {
  transaction.add(tx);
}
```

```js
const expressionStatement = babelisedCode
  .getExpressionStatements()
  .find((e) => {
    return (
      e.expression?.callee?.property?.name === "add" &&
      e.expression?.callee?.object?.name === "transaction" &&
      e.scope?.join() === "global,createAccount"
    );
  });
const callExpression = expressionStatement?.expression?.arguments?.[0];
assert.equal(
  callExpression?.name,
  "tx",
  "`tx` should be the first argument to `transaction.add`"
);
```

### `getExpressionStatement`

```js
await main();
```

```js
const mainExpressionStatement = babelisedCode.getExpressionStatement("main");
assert.exists(mainExpressionStatement, "You should call `main`");
assert.equal(
  mainExpressionStatement?.expression?.type,
  "AwaitExpression",
  "You should call `main` with `await`"
);
```

### `getImportDeclarations`

```js
import { PublicKey } from "@solana/web3.js";
```

```js
const importDeclaration = babelisedCode.getImportDeclarations().find((i) => {
  return i.source.value === "@solana/web3.js";
});
assert.exists(importDeclaration, "You should import from `@solana/web3.js`");
const importSpecifiers = importDeclaration.specifiers.map(
  (s) => s.imported.name
);
assert.include(
  importSpecifiers,
  "PublicKey",
  "`PublicKey` should be imported from `@solana/web3.js`"
);
```

### `getType`

```js
const tx = await program.methods.setupGame().rpc();
```

```js
const memberExpression = babelisedCode.getType("MemberExpression").find((m) => {
  return (
    m.object?.object?.name === "program" &&
    m.object?.property?.name === "methods"
  );
});
assert.exists(memberExpression, "`program.methods.` should exist");
const { property } = memberExpression;
assert.equal(
  property.name,
  "setupGame",
  "`program.methods.setupGame` should exist"
);
```

### `getLineAndColumnFromIndex`

```ts
const ACCOUNT_SIZE = borsh.serialize(
  HelloWorldSchema,
  new HelloWorldAccount()
).length;

export async function createAccount() {
  const lamports = await connection.getMinimumBalanceForRentExemption(
    ACCOUNT_SIZE
  );
}
```

```js
const account = babelisedCode.getVariableDeclarations().find((v) => {
  return v.declarations?.[0]?.id?.name === "ACCOUNT_SIZE";
});
const createAccount = babelisedCode.getFunctionDeclarations().find((f) => {
  return f.id?.name === "createAccount";
});

const { end } = account;
const { start } = createAccount;

const { line: accountLine } = babelisedCode.getLineAndColumnFromIndex(end);
const { line: createAccountLine } =
  babelisedCode.getLineAndColumnFromIndex(start);

assert.isBelow(
  accountLine,
  createAccountLine,
  `'ACCOUNT_SIZE' declared on line ${accountLine}, but should be declared before ${createAccountLine}`
);
```
