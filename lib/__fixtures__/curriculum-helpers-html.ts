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

const commentInQuoteExample = `
The string "<!--".
Optionally, text, with the additional restriction that the text must not start with the string ">", nor start with the string "->", nor contain the strings "<!--", "-->", or "--!>", nor end with the string "<!-".
The string "-->".
`;

const testValues = {
  htmlFullExample,
  htmlCodeWithCommentsRemoved,
  commentInQuoteExample,
};

export default testValues;
