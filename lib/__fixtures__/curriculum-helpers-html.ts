const htmlFullExample = `
<!--
multi line html comment
-->

not a comment

not a commment <!-- single line html comment --> not a comment
not a comment
<!-- this is my blog: <mynixworld.inf> -->
not a comment
`;

const htmlCodeWithCommentsRemoved = `


not a comment

not a commment  not a comment
not a comment

not a comment
`;

const htmlExampleHead = `
<link rel="stylesheet" href="styles.css">
<head>
  <meta charset="UTF-8" />
  <title>Piano</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>`;

const htmlInnerExample = `
  <meta charset="UTF-8" />
  <title>Piano</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
`;

const testValues = {
  htmlFullExample,
  htmlCodeWithCommentsRemoved,
  htmlExampleHead,
  htmlInnerExample,
};

export default testValues;
