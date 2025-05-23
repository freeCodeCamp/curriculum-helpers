import { spawnSync } from "child_process";

import setupPuppeteer from "jest-environment-puppeteer/setup";

export default async (globalConfig) => {
	// It's necessary spawnSync the webpack process to ensure that the build is
	// complete before the tests start
	const result = spawnSync("webpack", ["--color", "--env", "development"], {
		encoding: "utf8",
	});

	// only log if there is an error
	if (result.status) {
		console.log(result.stdout);
		console.error(result.stderr);
	}

	await setupPuppeteer(globalConfig);
};
