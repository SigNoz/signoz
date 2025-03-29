/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-var-requires */
const {
	ColorTailwind,
	spacingTokens,
	typographyTokens,
} = require('@signozhq/design-tokens');

// Helper function to extract token values
const mapTokenValues = (tokens) =>
	Object.fromEntries(
		Object.entries(tokens).map(([key, token]) => [key, token.value]),
	);

module.exports = {
	theme: {
		extend: {
			colors: {
				...ColorTailwind,
			},
			spacing: {
				...mapTokenValues(spacingTokens.padding),
				...mapTokenValues(spacingTokens.margin),
			},
			fontSize: mapTokenValues(typographyTokens.fontSize),
			fontWeight: mapTokenValues(typographyTokens.fontWeight),
		},
	},
	plugins: [],
};
