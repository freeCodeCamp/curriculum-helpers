import { Explorer } from "../helpers/lib/class/explorer";
import { chainMatches } from "../helpers/lib/index";

describe("chain", () => {
  it("flattens a chained call expression assigned to a function variable", () => {
    const { allFunctions } = new Explorer(`
      const initialFetch = async () => {
        fetch('https://example.com')
          .then((res) => res.json())
          .then((data) => {
            authorDataArr = data;
            displayAuthors(authorDataArr.slice(startingIndex, endingIndex));
          })
          .catch((err) => {
            authorContainer.innerHTML = '<p class="error-msg">Oops</p>';
          });
      };
    `);

    const { chain } = allFunctions.initialFetch;
    expect(chain).toHaveLength(4);
    expect(
      chain?.map((link) =>
        "call" in link ? link.call : "method" in link ? link.method : null,
      ),
    ).toEqual(["fetch", "then", "then", "catch"]);

    const [base, firstThen, secondThen, catchLink] = chain;
    expect(
      "args" in base && base.args[0].matches("'https://example.com'"),
    ).toBe(true);

    expect("params" in firstThen && firstThen.params[0].matches("res")).toBe(
      true,
    );
    expect("body" in firstThen && firstThen.body[0].matches("res.json()")).toBe(
      true,
    );

    expect("body" in secondThen && secondThen.body).toHaveLength(2);
    expect(
      "body" in secondThen &&
        secondThen.body[0].matches("authorDataArr = data"),
    ).toBe(true);
    expect(
      "body" in secondThen &&
        secondThen.body[1].matches(
          "displayAuthors(authorDataArr.slice(startingIndex, endingIndex))",
        ),
    ).toBe(true);

    expect("method" in catchLink && catchLink.method).toBe("catch");
    expect(
      "body" in catchLink &&
        catchLink.body[0].matches(
          `authorContainer.innerHTML = "<p class=\\"error-msg\\">Oops</p>"`,
        ),
    ).toBe(true);
  });

  it("works when the chain is the expression body of an arrow function", () => {
    const { allFunctions } = new Explorer(
      "const run = () => fetch('a').then((x) => x.json());",
    );
    const { chain } = allFunctions.run;
    expect(chain).toHaveLength(2);
  });

  it("works on a bare chain expression, not wrapped in a function", () => {
    const explorer = new Explorer(
      "fetch('a').then((x) => x.json());",
      "expression",
    );
    const { chain } = explorer;
    expect(chain).toHaveLength(2);
  });

  it("finds a bare chain statement sitting among other top-level statements", () => {
    const explorer = new Explorer(`
      const authorContainer = document.getElementById('author-container');
      const loadMoreBtn = document.getElementById('load-more-btn');

      fetch('a')
        .then((res) => res.json())
        .then((data) => {
          console.log(data);
        });
    `);

    const { chain } = explorer;
    expect(
      chain?.map((link) =>
        "call" in link ? link.call : "method" in link ? link.method : null,
      ),
    ).toEqual(["fetch", "then", "then"]);
  });

  it("flattens a chain that starts from a plain variable, not a call", () => {
    const { variables } = new Explorer(
      "const filtered = items.filter((item) => item.includes(query));",
    );

    const { chain } = variables.filtered.value;
    expect(chain).toHaveLength(2);

    const [receiverLink, methodLink] = chain;
    expect(
      "receiver" in receiverLink && receiverLink.receiver.matches("items"),
    ).toBe(true);
    expect("method" in methodLink && methodLink.method).toBe("filter");
    expect("params" in methodLink && methodLink.params[0].matches("item")).toBe(
      true,
    );
    expect(
      "body" in methodLink &&
        methodLink.body[0].matches("item.includes(query)"),
    ).toBe(true);
  });

  it("flattens a multi-link chain starting from a plain variable", () => {
    const { variables } = new Explorer(
      "const result = array.map((el) => Number(el)).filter((n) => n > 0);",
    );

    const { chain } = variables.result.value;
    expect(
      chain?.map((link) =>
        "receiver" in link
          ? link.receiver.toString()
          : "call" in link
            ? link.call
            : link.method,
      ),
    ).toEqual(["array", "map", "filter"]);
  });

  it("returns null for a receiver that is neither an identifier nor a property access", () => {
    const explorer = new Explorer("(1 + 2).toString();", "expression");
    expect(explorer.chain).toBeNull();
  });

  it("finds a chain wrapped in a return statement, among other statements", () => {
    const { allFunctions } = new Explorer(`
      const run = () => {
        const unrelated = 1 + 2;
        return items.filter((item) => item.includes(query));
      };
    `);

    const { chain } = allFunctions.run;
    expect(
      chain?.map((link) =>
        "receiver" in link
          ? link.receiver.toString()
          : "call" in link
            ? link.call
            : link.method,
      ),
    ).toEqual(["items", "filter"]);
  });

  it("finds a nested chain inside a callback's `return <chain>;` body", () => {
    const { variables } = new Explorer(
      "const filtered = items.filter((item) => { return item.toLowerCase().includes(query.toLowerCase()); });",
    );

    const [, filterLink] = variables.filtered.value.chain;
    expect("body" in filterLink && filterLink.body).toHaveLength(1);

    const nestedChain = "body" in filterLink ? filterLink.body[0].chain : null;
    expect(
      nestedChain?.map((link) =>
        "receiver" in link
          ? link.receiver.toString()
          : "call" in link
            ? link.call
            : link.method,
      ),
    ).toEqual(["item", "toLowerCase", "includes"]);
  });

  it("tolerates bare (unparenthesized) single-parameter callbacks", () => {
    const { allFunctions } = new Explorer(
      "const run = () => fetch('a').then(res => res.json());",
    );
    const { chain } = allFunctions.run;
    const link = chain?.[1];
    expect(link && "params" in link && link.params[0].matches("res")).toBe(
      true,
    );
  });

  it("returns null when there is no call-expression chain", () => {
    const { variables } = new Explorer("const a = 1;");
    expect(variables.a.chain).toBeNull();

    const empty = new Explorer();
    expect(empty.chain).toBeNull();
  });

  it("returns a one-link chain for a single, non-chained call", () => {
    const explorer = new Explorer("fetch('a');", "expression");
    const { chain } = explorer;
    expect(chain).toHaveLength(1);
    expect(chain?.[0] && "call" in chain[0] && chain[0].call).toBe("fetch");
  });
});

describe("chainMatches", () => {
  const getChain = (code: string) => new Explorer(code, "expression").chain;

  it("matches an identical chain description", () => {
    const chain = getChain(
      "fetch('https://example.com').then((res) => res.json())",
    );

    expect(
      chainMatches(chain, [
        { call: "fetch", args: ["'https://example.com'"] },
        { method: "then", params: ["res"], body: ["res.json()"] },
      ]),
    ).toBe(true);
  });

  it("tolerates quote style and paren style differences, like matches()", () => {
    const chain = getChain(
      `fetch("https://example.com").then(res => res.json())`,
    );

    expect(
      chainMatches(chain, [
        { call: "fetch", args: ["'https://example.com'"] },
        { method: "then", params: ["res"], body: ["res.json()"] },
      ]),
    ).toBe(true);
  });

  it("allows omitting args/params/body to only check method names", () => {
    const chain = getChain(
      "fetch('https://example.com').then((res) => res.json())",
    );

    expect(chainMatches(chain, [{ call: "fetch" }, { method: "then" }])).toBe(
      true,
    );
  });

  it("returns false when the chain is null", () => {
    expect(chainMatches(null, [{ call: "fetch" }])).toBe(false);
  });

  it("returns false when the link count differs", () => {
    const chain = getChain("fetch('https://example.com')");

    expect(chainMatches(chain, [{ call: "fetch" }, { method: "then" }])).toBe(
      false,
    );
  });

  it("returns false when a method name differs", () => {
    const chain = getChain(
      "fetch('https://example.com').then((res) => res.json())",
    );

    expect(chainMatches(chain, [{ call: "fetch" }, { method: "catch" }])).toBe(
      false,
    );
  });

  it("returns false when a body statement differs", () => {
    const chain = getChain(
      "fetch('https://example.com').then((res) => res.json())",
    );

    expect(
      chainMatches(chain, [
        { call: "fetch" },
        { method: "then", params: ["res"], body: ["res.text()"] },
      ]),
    ).toBe(false);
  });

  it("matches a body entry against a list of acceptable alternatives", () => {
    const isNaNChain = getChain("numbers.filter((el) => !isNaN(el))");
    const numberIsNaNChain = getChain(
      "numbers.filter((el) => !Number.isNaN(el))",
    );

    const expected = [
      { receiver: "numbers" },
      {
        method: "filter",
        params: ["el"],
        body: [["!isNaN(el)", "!Number.isNaN(el)"]],
      },
    ];

    expect(chainMatches(isNaNChain, expected)).toBe(true);
    expect(chainMatches(numberIsNaNChain, expected)).toBe(true);
  });

  it("rejects when none of the body alternatives match", () => {
    const chain = getChain("numbers.filter((el) => el > 0)");

    expect(
      chainMatches(chain, [
        { receiver: "numbers" },
        {
          method: "filter",
          params: ["el"],
          body: [["!isNaN(el)", "!Number.isNaN(el)"]],
        },
      ]),
    ).toBe(false);
  });

  it("matches an args/params/receiver entry against a list of alternatives", () => {
    const chain = getChain("array.map(String)");

    expect(
      chainMatches(chain, [
        { receiver: ["array", "arr"] },
        { method: "map", args: [["Number", "String"]] },
      ]),
    ).toBe(true);
  });

  it("matches a chain that starts from a plain variable", () => {
    const { chain } = new Explorer(
      "const filtered = items.filter((item) => item.includes(query));",
    ).variables.filtered.value;

    expect(
      chainMatches(chain, [
        { receiver: "items" },
        { method: "filter", params: ["item"], body: ["item.includes(query)"] },
      ]),
    ).toBe(true);
  });

  it("returns false when the receiver differs", () => {
    const { chain } = new Explorer(
      "const filtered = items.filter((item) => item.includes(query));",
    ).variables.filtered.value;

    expect(
      chainMatches(chain, [{ receiver: "otherItems" }, { method: "filter" }]),
    ).toBe(false);
  });

  it("matches a method link's raw args when the argument isn't a callback", () => {
    const { chain } = new Explorer("const numbers = array.map(Number);")
      .variables.numbers.value;

    expect(
      chainMatches(chain, [
        { receiver: "array" },
        { method: "map", args: ["Number"] },
      ]),
    ).toBe(true);
  });

  it("matches a method link's raw args alongside a non-callback second argument", () => {
    const { chain } = new Explorer(
      "const filtered = items.filter((item) => item.toLowerCase().includes(query.toLowerCase()));",
    ).variables.filtered.value;

    const filterLink = chain?.[1];
    const nested =
      filterLink && "body" in filterLink ? filterLink.body[0].chain : null;

    expect(
      chainMatches(nested, [
        { receiver: "item" },
        { method: "toLowerCase" },
        { method: "includes", args: ["query.toLowerCase()"] },
      ]),
    ).toBe(true);
  });

  it("returns false when a method link's raw args differ", () => {
    const { chain } = new Explorer("const numbers = array.map(Number);")
      .variables.numbers.value;

    expect(
      chainMatches(chain, [
        { receiver: "array" },
        { method: "map", args: ["String"] },
      ]),
    ).toBe(false);
  });
});
