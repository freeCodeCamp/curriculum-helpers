# Rust

## Regex

Testing a struct:

```javascript,mdbook-runnable
const code = `
fn main() {
  let _ = StructName {
    one_field: 1,
    field_name: [1, 2]
  };
}

struct StructName {
  one_field: usize,
  field_name: [usize; 2]
}
`;
{
  const struct = code.match(/struct StructName[^\{]*?{([^\}]*)}/s)?.[1];
  console.assert(struct.match(/field_name\s*:/));
  console.log(struct);
}
```

Remove two or more space/tab characters to reduce the number of `\s` checks:

```javascript,mdbook-runnable
const code = `
fn main() {
  let _ = StructName {
    one_field: "example",
    field_name: [1, 2]
  };
}

struct     StructName<'a> {
  one_field : &'a str ,
  field_name: [usize; 2]
}
`;
{
  // Keywords **require** one or more spaces. So, replace instances of 2+ spaces
  // with one space, to turn `/struct\s+StringName/` into `/struct StringName/`
  const reducedCode = code.replaceAll(/[ \t]{2,}/g, ' ');
  const struct = reducedCode.match(/struct StructName[^\{]*?{([^\}]*)}/s)?.[1];
  console.assert(struct.match(/field_name\s*:/));
  console.log(struct);
}
```
