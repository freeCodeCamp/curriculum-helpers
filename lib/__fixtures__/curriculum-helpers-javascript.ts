const jsCodeWithSingleAndMultLineComments = `
function nonMutatingPush(original, newItem) {
  /* This is a 
    multi-line comment 
    that should be removed. */
  return original.push(newItem);
}
var first = [1, 2, 3];
// This is a single line comment
var second = [4, 5];
nonMutatingPush(first, second);`;

const jsCodeWithSingleAndMultLineCommentsRemoved = `
function nonMutatingPush(original, newItem) {
    return original.push(newItem);
}
var first = [1, 2, 3];

var second = [4, 5];
nonMutatingPush(first, second);`;

const jsCodeWithUrl = `
function nonMutatingPush(original, newItem) {
  var url = 'https://freecodecamp.org'; // this comment should vanish
  return original.push(newItem);
}`;

const jsCodeWithUrlUnchanged = `
function nonMutatingPush(original, newItem) {
  var url = 'https://freecodecamp.org'; 
  return original.push(newItem);
}`;

const jsCodeWithNoCall = `function myFunc() {
  return Math.random();
}
`;

const jsCodeWithNoArgCall = `function myFunc() {
  return Math.random();
}
myFunc();
`;

const jsCodeWithArgCall = `function myFunc() {
  return Math.random();
}
myFunc('this shouldn't be here');
`;

const jsCodeWithCommentedCall = `function myFunc() {
  return Math.random();
}
/*
myFunc();
*/
`;

const codeString1 = "function myFunction(param1, param2 = 'default', param3) {";
const codeString2 =
  "const myFunction = (param1, param2 = 'default', param3) => {";
const codeString3 =
  "let myFunction = function(param1, param2 = 'default', param3) {";

const codeString4 = `const myFunc = name => console.log("Name")`;

const testValues = {
  jsCodeWithSingleAndMultLineComments,
  jsCodeWithSingleAndMultLineCommentsRemoved,
  jsCodeWithUrl,
  jsCodeWithUrlUnchanged,
  jsCodeWithNoCall,
  jsCodeWithNoArgCall,
  jsCodeWithArgCall,
  jsCodeWithCommentedCall,
  codeString1,
  codeString2,
  codeString3,
  codeString4,
};

export default testValues;
