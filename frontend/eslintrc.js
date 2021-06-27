module.exports = {
	files: ["**/*.{ts,tsx}"],
	parser: "@typescript-eslint/parser",
	plugins: ["@typescript-eslint/eslint-plugin"],
	rules: {
		"react/jsx-filename-extension": [
			"error",
			{
				extensions: [".tsx"],
			},
		],
		"react/prop-types": "off",
		"@typescript-eslint/explicit-function-return-type": "error",
	},
	extends: [
		"plugin:@typescript-eslint/recommended",
		"plugin:@typescript-eslint/eslint-recommended",
		"prettier/@typescript-eslint",
	],
	env: {
		browser: true,
		jest: true,
	},
};
