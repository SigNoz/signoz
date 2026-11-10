// oxlint-disable-next-line typescript/no-require-imports
const path = require('path');

module.exports = {
	plugins: [
		path.join(__dirname, 'stylelint-rules/no-unsupported-asset-url.js'),
		path.join(__dirname, 'stylelint-rules/css-modules/no-deep-nesting.js'),
		path.join(__dirname, 'stylelint-rules/css-modules/no-id-selectors.js'),
		path.join(
			__dirname,
			'stylelint-rules/css-modules/no-bare-element-selectors.js',
		),
		path.join(__dirname, 'stylelint-rules/css-modules/prefer-css-variables.js'),
		path.join(__dirname, 'stylelint-rules/css-modules/class-name-pattern.js'),
	],
	customSyntax: 'postcss-scss',
	rules: {
		// Applies to all SCSS files
		'local/no-unsupported-asset-url': true,
	},
	overrides: [
		{
			// CSS module-specific rules
			files: ['**/*.module.scss'],
			rules: {
				'local/no-deep-nesting': [true, { severity: 'warning' }],
				'local/no-id-selectors': true,
				'local/no-bare-element-selectors': true,
				'local/prefer-css-variables': [true, { severity: 'warning' }],
				'local/class-name-pattern': [true, { severity: 'warning' }],
			},
		},
	],
};
