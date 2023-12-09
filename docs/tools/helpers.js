const __helpers = {
  python: {
    getDef: (code, functionName) => {
      const regex = new RegExp(
        `\\n(?<function_indentation> *?)def +${functionName} *\\((?<function_parameters>[^\\)]*)\\)\\s*:\\n(?<function_body>.*?)(?=\\n\\k<function_indentation>[\\w#]|$)`,
        "s"
      );

      const matchedCode = regex.exec(code);
      if (matchedCode) {
        const { function_parameters, function_body, function_indentation } =
          matchedCode.groups;

        const functionIndentationSansNewLine = function_indentation.replace(
          /\n+/,
          ""
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
  },
};
