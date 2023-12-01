interface CodeNodeProps {
  type: string;
  value: string;
  match: string;
  newline: string;
  nodes: CodeNode[];
}

export type CodeNodeType = Partial<CodeNodeProps> | null;

export class CodeNode {
  type: string;
  value: unknown;
  match: string;
  newline: string;

  constructor(node: CodeNodeType) {
    this.type = node.type;
    if (node.value) this.value = node.value;
    if (node.match) this.match = node.match;
    this.newline = node.newline || "";
  }

  get protected() {
    return Boolean(this.match) && this.match[1] === "!";
  }
}

export class Block extends CodeNode {
  nodes: CodeNode[];

  constructor(node: CodeNodeType) {
    super(node);
    this.nodes = node.nodes || [];
  }

  push(node: CodeNode) {
    this.nodes.push(node);
  }

  get protected() {
    return this.nodes.length > 0 && this.nodes[0].protected === true;
  }
}
