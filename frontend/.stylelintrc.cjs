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
	// Disables of property-disallowed-list must say why after "--"
	reportDescriptionlessDisables: [
		false,
		{ except: ['property-disallowed-list'], severity: 'error' },
	],
	rules: {
		// Applies to all SCSS files
		'local/no-unsupported-asset-url': true,
		// Text style goes through @signozhq/ui/typography props
		'property-disallowed-list': [
			['/^font/', '/^text-/', 'line-height', 'letter-spacing'],
			{
				severity: 'warning',
				message: (property) =>
					`Do not set "${property}" in CSS. Render the text with @signozhq/ui/typography and use its props, or disable this rule with a reason after "--" saying why Typography cannot.`,
			},
		],
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
