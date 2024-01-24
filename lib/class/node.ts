type CodeNodeArgs = {
  type: string;
  value?: string;
  match?: RegExpExecArray;
  newline?: string;
  nodes?: CodeNode[];
};

export class CodeNode {
  type: string;
  value?: string;
  match: RegExpExecArray | undefined;
  newline: string;

  constructor(node: CodeNodeArgs) {
    this.type = node.type;
    this.value = node.value;
    this.match = node.match;
    this.newline = node.newline || "";
  }

  get protected() {
    return Boolean(this.match && this.match[1] === "!");
  }
}

export class Block extends CodeNode {
  nodes: CodeNode[];

  constructor(node: CodeNodeArgs) {
    super(node);
    this.nodes = node?.nodes || [];
  }

  push(node: CodeNode) {
    this.nodes.push(node);
  }

  get protected() {
    return this.nodes.length > 0 && this.nodes[0].protected === true;
  }
}
