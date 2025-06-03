const __helpers = {
  python: {
    getDef: (code, functionName) => {
      const regex = new RegExp(
        `^(?<function_indentation> *?)def +${functionName} *\\((?<function_parameters>[^\\)]*)\\)\\s*:\\n(?<function_body>.*?)(?=\\n\\k<function_indentation>[\\w#]|$)`,
        "ms",
      );

      const matchedCode = regex.exec(code);
      if (matchedCode) {
        const { function_parameters, function_body, function_indentation } =
          matchedCode.groups;

        const functionIndentationSansNewLine = function_indentation.replace(
          /\n+/,
          "",
        );
        return {
          def: matchedCode[0],
          function_parameters,
          function_body,
          function_indentation: functionIndentationSansNewLine.length,
        };
      }

      return null;
    },
    getBlock: (code, blockPattern) => {
      const escapedBlockPattern =
        blockPattern instanceof RegExp
          ? blockPattern.source
          : blockPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const regex = new RegExp(
        `^(?<block_indentation> *?)(?<block_condition>${escapedBlockPattern})\\s*:\\n(?<block_body>.*?)(?=\\n\\k<block_indentation>[\\w#]|$)`,
        "ms",
      );

      const matchedCode = regex.exec(code);
      if (matchedCode) {
        /* eslint-disable camelcase */
        const { block_body, block_indentation, block_condition } =
          matchedCode.groups;

        const blockIndentationSansNewLine = block_indentation.replace(
          /\n+/g,
          "",
        );
        return {
          block_body,
          block_condition,
          block_indentation: blockIndentationSansNewLine.length,
        };
        /* eslint-enable camelcase */
      }

      return null;
    },
    removeComments: (code) => {
      return code.replace(/\/\/.*|\/\*[\s\S]*?\*\/|(#.*$)/gm, "");
    },
  },
};
