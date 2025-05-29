// this is enabled by vitest-puppeteer in CI, but we're using it locally so both
// environments behave the same way
module.exports = {
	launch: {
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-background-timer-throttling",
			"--disable-backgrounding-occluded-windows",
			"--disable-renderer-backgrounding",
		],
	},
	server: {
		command: "http-server __fixtures__",
		port: 8080,
	},
};
