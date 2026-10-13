import { describe, expect, it } from "vitest";
import {
  removeHtmlComments,
  removeCssComments,
  removeJSComments,
  python,
} from "../helpers/lib";
describe("HTML comment removal", () => {
  it.each([
    ["<svg><title><!-- remove --></title></svg>", "<svg><title></title></svg>"],
    [
      '<div title="a > <!-- keep -->">text<!-- remove --></div>',
      '<div title="a > <!-- keep -->">text</div>',
    ],
    ['<div title="<!-- unfinished', '<div title="<!-- unfinished'],
    [
      '<div title="<!-- note -->"><!-- remove --></div>',
      '<div title="<!-- note -->"></div>',
    ],
    [
      "<div title='<!-- note -->'><!-- remove --></div>",
      "<div title='<!-- note -->'></div>",
    ],
    [
      "<template><!-- remove --><p>keep</p></template>",
      "<template><p>keep</p></template>",
    ],
    ["<!-- outer <!-- inner -->keep", "keep"],
    ["before<!-- unfinished", "before"],
    ["a<!---->b<!-- remove -->c", "abc"],
    [
      '<DIV title="a &amp; b">keep</DIV><!-- remove -->',
      '<DIV title="a &amp; b">keep</DIV>',
    ],
  ])("preserves non-comment source in %s", (source, expected) => {
    expect(removeHtmlComments(source)).toBe(expected);
  });
});
describe("CSS comment removal", () => {
  it.each([
    ['a { background: url("a"/* remove */); }', 'a { background: url("a"); }'],
    [
      'a { background: url( "a" /* remove */); }',
      'a { background: url( "a" ); }',
    ],
    ["a { background: url(a/* keep", "a { background: url(a/* keep"],
    [
      'a { background: url("a)/* keep */"); /* remove */ }',
      'a { background: url("a)/* keep */");  }',
    ],
    ["a { --value: myurl(/* remove */); }", "a { --value: myurl(); }"],
    ['a { content: "/* unfinished', 'a { content: "/* unfinished'],
    [
      'a { content: "/* keep */"; /* remove */ }',
      'a { content: "/* keep */";  }',
    ],
    ["a { content: '/* keep */'; /**/ }", "a { content: '/* keep */';  }"],
    [
      String.raw`a { content: "a\"/* keep */"; /* remove */ }`,
      String.raw`a { content: "a\"/* keep */";  }`,
    ],
    [
      'a { background: url("https://example.com/a/*b*/"); /* remove */ }',
      'a { background: url("https://example.com/a/*b*/");  }',
    ],
    [
      "a { background: url(https://example.com/a/*b*/); /* remove */ }",
      "a { background: url(https://example.com/a/*b*/);  }",
    ],
    ["a/**/.b { color: red; }", "a.b { color: red; }"],
    ["/* outer /* inner */ a {}", " a {}"],
    ["a {} /* unfinished", "a {} "],
    ["/**/a {}/* one *//* two */", "a {}"],
  ])("preserves non-comment source in %s", (source, expected) => {
    expect(removeCssComments(source)).toBe(expected);
  });
});
describe("JavaScript comment removal", () => {
  it.each([
    ["const/**//**/value = 1;", "const value = 1;"],
    ["a/* one */ /* two */b", "a b"],
    [String.raw`a/* \*/b`, "a b"],
    ['function f() { return"// keep"; }', 'function f() { return"// keep"; }'],
    ["a/*\r\ncomment\u2028comment\u2029*/b", "a\r\n\u2028\u2029b"],
    ["const text = `unfinished\n/* keep", "const text = `unfinished\n/* keep"],
    ["const text = `unfinished\n// keep", "const text = `unfinished\n// keep"],
    [
      'const text = "unfinished\n// remove\nnext(); /* unfinished\nrest',
      'const text = "unfinished\n\nnext(); \n',
    ],
    [
      'const value = "text\u2028// keep"; // remove',
      'const value = "text\u2028// keep"; ',
    ],
    ['const value = "unfinished // keep', 'const value = "unfinished // keep'],
    ["const value = 10 / 2; /* remove */", "const value = 10 / 2; "],
    [
      'const text = "// keep /* keep */"; // remove',
      'const text = "// keep /* keep */"; ',
    ],
    [
      String.raw`const text = "a\\"; // remove`,
      String.raw`const text = "a\\"; `,
    ],
    [
      String.raw`const re = /https?:\/\//; /* remove */`,
      String.raw`const re = /https?:\/\//; `,
    ],
    ["/* outer /* inner */ code();", " code();"],
    ["const n = 1; /* unfinished", "const n = 1; "],
    ["const n = ; // remove\nnext();", "const n = ; \nnext();"],
    ["a(); // remove\rb(); // remove\r", "a(); \rb(); \r"],
    ["a(); // remove\u2028b(); // remove\u2029", "a(); \u2028b(); \u2029"],
    ["a(); /* remove */\nb();", "a(); \nb();"],
    [
      "function f() { return/*\n remove */42; }",
      "function f() { return\n42; }",
    ],
    ["const/**/value = 1;", "const value = 1;"],
    ["a +/**/+ b;", "a + + b;"],
    ["const value: number = 1; // remove", "const value: number = 1; "],
  ])("preserves literals and code in %s", (source, expected) => {
    expect(removeJSComments(source)).toBe(expected);
  });
});
describe("Python comment removal", () => {
  it.each([
    ['value = "# unfinished', 'value = "# unfinished'],
    ['value = f"{1:#04x}" # remove', 'value = f"{1:#04x}" '],
    ["value = 10 // 2 # remove", "value = 10 // 2 "],
    [
      'value = "# keep // keep /* keep */" # remove',
      'value = "# keep // keep /* keep */" ',
    ],
    ["value = '# keep' # remove", "value = '# keep' "],
    ['value = """# keep\n# keep""" # remove', 'value = """# keep\n# keep""" '],
    ["value = '''# keep\n# keep''' # remove", "value = '''# keep\n# keep''' "],
    [
      String.raw`value = "a\"# keep" # remove`,
      String.raw`value = "a\"# keep" `,
    ],
    [
      String.raw`value = r"a\"# keep" # remove`,
      String.raw`value = r"a\"# keep" `,
    ],
    ['value = b"# keep" # remove', 'value = b"# keep" '],
    ['value = f"# keep {10 // 2}" # remove', 'value = f"# keep {10 // 2}" '],
    ["value = ( # remove\n", "value = ( \n"],
    ["a = 1 # remove\r\nb = 2 # remove\r", "a = 1 \r\nb = 2 \r"],
  ])("preserves literals and operators in %s", (source, expected) => {
    expect(python.removeComments(source)).toBe(expected);
  });
});
