const path = require('path');

module.exports = {
	plugins: [path.join(__dirname, 'stylelint-rules/no-unsupported-asset-url.js')],
	customSyntax: 'postcss-scss',
	rules: {
		'local/no-unsupported-asset-url': true,
	},
};
