const AsyncFunction = async function () {}.constructor as FunctionConstructor;

export async function evalWithScope(
  code: string,
  scope: Record<string, unknown>,
): Promise<void> {
  const testFn = new AsyncFunction(...Object.keys(scope), code);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  await testFn(...Object.values(scope));
}
