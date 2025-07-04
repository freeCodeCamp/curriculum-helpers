// The newline is important, because otherwise comments will cause the trailing
// `}` to be ignored, breaking the tests.
export const createAsyncIife = (code: string) => `(async () => {${code};
})();`;
