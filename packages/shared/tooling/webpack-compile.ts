import { spawnSync } from "child_process";

export const webpackCompile = () => {
  // It's necessary spawnSync the webpack process to ensure that the build is
  // complete before the tests start
  const result = spawnSync("webpack", ["--color", "--env", "development"], {
    encoding: "utf8",
  });

  // Only log if there is an error
  if (result.status) {
    console.log(result.stdout);
    console.error(result.stderr);
  }
};
