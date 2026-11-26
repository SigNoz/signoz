const SLOT = 'builder_ai_query';

function isSlotKey(key, computed) {
	if (key.type === 'Literal') {
		return key.value === SLOT;
	}
	return !computed && key.type === 'Identifier' && key.name === SLOT;
}

// Generated enums like Querybuildertypesv5QueryTypeDTO.builder_ai_query are not queries
function isGeneratedEnum(object) {
	return object.type === 'Identifier' && /^[A-Z]/.test(object.name);
}

export default {
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Disallow direct builder_ai_query access; use the lib/query/builderSlot helpers',
			category: 'Query Builder',
		},
		schema: [],
		messages: {
			useSlotHelper:
				'Use getActiveBuilder, getBuilderBySlotKey or replaceBuilderBySlotKey from lib/query/builderSlot instead of accessing builder_ai_query directly.',
		},
	},
	create(context) {
		return {
			MemberExpression(node) {
				if (
					isSlotKey(node.property, node.computed) &&
					!isGeneratedEnum(node.object)
				) {
					context.report({ node, messageId: 'useSlotHelper' });
				}
			},
			ObjectPattern(node) {
				node.properties.forEach((property) => {
					if (
						property.type === 'Property' &&
						isSlotKey(property.key, property.computed)
					) {
						context.report({ node: property, messageId: 'useSlotHelper' });
					}
				});
			},
		};
	},
};
