// Strict config for new files - rules that are warnings in base config become errors here
// oxlint-disable-next-line typescript/no-require-imports
const baseConfig = require('./.stylelintrc.cjs');

module.exports = {
	...baseConfig,
	rules: {
		...baseConfig.rules,
		// Override warnings to errors for new files
		'local/no-font-properties': true, // error (no severity = error)
		'local/no-primitive-color-tokens': true,
		'local/no-styles-scss': true,
	},
};
