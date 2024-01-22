export const languages: Record<
  string,
  { LINE_REGEX?: RegExp; BLOCK_OPEN_REGEX?: RegExp; BLOCK_CLOSE_REGEX?: RegExp }
> = {
  ada: {
    LINE_REGEX: /^--.*/,
  },
  apl: {
    LINE_REGEX: /^⍝.*/,
  },
  applescript: {
    BLOCK_OPEN_REGEX: /^\(\*/,
    BLOCK_CLOSE_REGEX: /^\*\)/,
  },
  csharp: {
    LINE_REGEX: /^\/\/.*/,
  },
  haskell: {
    BLOCK_OPEN_REGEX: /^\{-/,
    BLOCK_CLOSE_REGEX: /^-\}/,
    LINE_REGEX: /^--.*/,
  },
  javascript: {
    BLOCK_OPEN_REGEX: /^\/\*\*?(!?)/,
    BLOCK_CLOSE_REGEX: /^\*\/(\n?)/,
    LINE_REGEX: /^\/\/(!?).*/,
  },
  lua: {
    BLOCK_OPEN_REGEX: /^--\[\[/,
    BLOCK_CLOSE_REGEX: /^\]\]/,
    LINE_REGEX: /^--.*/,
  },
  matlab: {
    BLOCK_OPEN_REGEX: /^%{/,
    BLOCK_CLOSE_REGEX: /^%}/,
    LINE_REGEX: /^%.*/,
  },
  perl: {
    LINE_REGEX: /^#.*/,
  },
  php: {
    BLOCK_OPEN_REGEX: /^\/\*\*?(!?)/,
    BLOCK_CLOSE_REGEX: /^\*\/(\n?)/,
    LINE_REGEX: /^(#|\/\/).*?(?=\?>|\n)/,
  },
  ruby: {
    BLOCK_OPEN_REGEX: /^=begin/,
    BLOCK_CLOSE_REGEX: /^=end/,
    LINE_REGEX: /^#.*/,
  },
  shebang: {
    LINE_REGEX: /^#!.*/,
  },
  python: {
    BLOCK_OPEN_REGEX: /^"""/,
    BLOCK_CLOSE_REGEX: /^"""/,
    LINE_REGEX: /^#.*/,
  },
  c: {
    BLOCK_OPEN_REGEX: /^\/\*\*?(!?)/,
    BLOCK_CLOSE_REGEX: /^\*\/(\n?)/,
    LINE_REGEX: /^\/\/(!?).*/,
  },
  css: {
    BLOCK_OPEN_REGEX: /^\/\*\*?(!?)/,
    BLOCK_CLOSE_REGEX: /^\*\/(\n?)/,
    LINE_REGEX: /^\/\/(!?).*/,
  },
  java: {
    BLOCK_OPEN_REGEX: /^\/\*\*?(!?)/,
    BLOCK_CLOSE_REGEX: /^\*\/(\n?)/,
    LINE_REGEX: /^\/\/(!?).*/,
  },
  js: {
    BLOCK_OPEN_REGEX: /^\/\*\*?(!?)/,
    BLOCK_CLOSE_REGEX: /^\*\/(\n?)/,
    LINE_REGEX: /^\/\/(!?).*/,
  },
  less: {
    BLOCK_OPEN_REGEX: /^\/\*\*?(!?)/,
    BLOCK_CLOSE_REGEX: /^\*\/(\n?)/,
    LINE_REGEX: /^\/\/(!?).*/,
  },
  pascal: {
    BLOCK_OPEN_REGEX: /^\(\*/,
    BLOCK_CLOSE_REGEX: /^\*\)/,
  },
  ocaml: {
    BLOCK_OPEN_REGEX: /^\(\*/,
    BLOCK_CLOSE_REGEX: /^\*\)/,
  },
  sass: {
    BLOCK_OPEN_REGEX: /^\/\*\*?(!?)/,
    BLOCK_CLOSE_REGEX: /^\*\/(\n?)/,
    LINE_REGEX: /^\/\/(!?).*/,
  },
  sql: {
    LINE_REGEX: /^--.*/,
  },
  swift: {
    BLOCK_OPEN_REGEX: /^\/\*\*?(!?)/,
    BLOCK_CLOSE_REGEX: /^\*\/(\n?)/,
    LINE_REGEX: /^\/\/(!?).*/,
  },
  ts: {
    BLOCK_OPEN_REGEX: /^\/\*\*?(!?)/,
    BLOCK_CLOSE_REGEX: /^\*\/(\n?)/,
    LINE_REGEX: /^\/\/(!?).*/,
  },
  typscript: {
    BLOCK_OPEN_REGEX: /^\/\*\*?(!?)/,
    BLOCK_CLOSE_REGEX: /^\*\/(\n?)/,
    LINE_REGEX: /^\/\/(!?).*/,
  },
};
