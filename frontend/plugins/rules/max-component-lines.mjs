/**
 * Rule: max-component-lines
 *
 * Warns when a component file exceeds configured line limit.
 * Large components should be split into smaller ones.
 *
 * Config: ["warn", { "max": 300 }]
 * Default: 300 lines
 *
 * This rule should always be "warn" (never "error").
 */

const DEFAULT_MAX_LINES = 300;

export default {
	meta: {
		docs: {
			description: 'Warn when component files exceed a line limit',
			category: 'Code Quality',
		},
		schema: [
			{
				type: 'object',
				properties: {
					max: {
						type: 'number',
						minimum: 1,
					},
				},
				additionalProperties: false,
			},
		],
	},
	create(context) {
		const options = context.options?.[0] || {};
		const maxLines = options.max || DEFAULT_MAX_LINES;
		const filename = context.getFilename();

		// Only check .tsx files (component files)
		if (!/\.tsx$/.test(filename)) {
			return {};
		}

		// Skip test files
		if (/\.(test|spec)\.tsx$/.test(filename)) {
			return {};
		}

		// Skip utility/type files
		if (
			/\/(utils|helpers|constants|types|hooks)\.(ts|tsx)$/.test(filename) ||
			/\/(utils|helpers|constants|types)\//.test(filename)
		) {
			return {};
		}

		return {
			Program(node) {
				const sourceCode = context.getSourceCode();
				const lines = sourceCode.lines?.length || sourceCode.getText().split('\n').length;

				if (lines > maxLines) {
					context.report({
						node,
						message: `Component file has ${lines} lines (max ${maxLines}). Consider splitting into smaller components or extracting logic into hooks/utils.`,
					});
				}
			},
		};
	},
};
