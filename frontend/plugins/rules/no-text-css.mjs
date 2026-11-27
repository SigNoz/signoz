/**
 * Rule: no-text-css
 *
 * Text style (font, line height, letter spacing, case, alignment, overflow)
 * belongs to Typography props, not to CSS written in a component.
 *
 * This rule catches font and text properties in:
 *   <div style={{ fontSize: 12 }} />            style and *Style props
 *   <Modal styles={{ body: { fontWeight: 500 } }} />
 *   const s: CSSProperties = { lineHeight: 1 }  objects typed CSSProperties
 *   ({ ... }) as CSSProperties, satisfies CSSProperties
 *   (): CSSProperties => ({ ... })              functions returning CSSProperties
 *   styled.div`font-size: 12px;`                styled-components templates,
 *   ${(p) => p.small && 'font-size: 11px;'}     strings in their interpolations
 *
 * Identifiers passed to a style prop are followed to a local object literal.
 * SCSS is covered by the stylelint config.
 */

const MESSAGE = (property) =>
	`Do not set '${property}' in CSS. Render the text with @signozhq/ui/typography and use its props, or disable this rule with a reason after \`--\` saying why Typography cannot.`;

const BANNED_JS = /^(font([A-Z]\w*)?|text[A-Z]\w*|lineHeight|letterSpacing)$/;
const BANNED_CSS =
	/(^|[\s;{])(font(-[a-z]+)*|text-[a-z-]+|line-height|letter-spacing)\s*:/g;

const STYLE_TAGS = new Set(['css', 'createGlobalStyle', 'keyframes']);

const FUNCTIONS = new Set([
	'ArrowFunctionExpression',
	'FunctionExpression',
	'FunctionDeclaration',
]);

const camelCase = (name) =>
	name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

function propertyName(property) {
	if (property.computed) {
		return null;
	}
	if (property.key.type === 'Identifier') {
		return property.key.name;
	}
	if (
		property.key.type === 'Literal' &&
		typeof property.key.value === 'string'
	) {
		return property.key.value;
	}
	return null;
}

function isCssPropertiesType(typeNode) {
	if (!typeNode || typeNode.type !== 'TSTypeReference') {
		return false;
	}
	const name = typeNode.typeName;
	if (name.type === 'Identifier') {
		return name.name === 'CSSProperties';
	}
	return name.type === 'TSQualifiedName' && name.right.name === 'CSSProperties';
}

// Record<K, CSSProperties> and { [key: string]: CSSProperties }
function isCssPropertiesMapType(typeNode) {
	if (!typeNode) {
		return false;
	}
	if (
		typeNode.type === 'TSTypeReference' &&
		typeNode.typeName.type === 'Identifier' &&
		typeNode.typeName.name === 'Record'
	) {
		const params = (typeNode.typeArguments ?? typeNode.typeParameters)?.params;
		return isCssPropertiesType(params?.[1]);
	}
	if (typeNode.type === 'TSTypeLiteral') {
		return typeNode.members.some(
			(member) =>
				member.type === 'TSIndexSignature' &&
				isCssPropertiesType(member.typeAnnotation?.typeAnnotation),
		);
	}
	return false;
}

function rootIdentifier(node) {
	let current = node;
	while (current) {
		if (current.type === 'Identifier') {
			return current.name;
		}
		if (current.type === 'MemberExpression') {
			current = current.object;
		} else if (current.type === 'CallExpression') {
			current = current.callee;
		} else {
			return null;
		}
	}
	return null;
}

function isStyleTag(tag) {
	if (tag.type === 'Identifier') {
		return tag.name === 'styled' || STYLE_TAGS.has(tag.name);
	}
	return rootIdentifier(tag) === 'styled';
}

export default {
	create(context) {
		const reported = new Set();
		const followed = new Set();
		const reportedCss = new Set();

		function report(property, name) {
			if (reported.has(property)) {
				return;
			}
			reported.add(property);
			context.report({ node: property.key, message: MESSAGE(name) });
		}

		function resolveIdentifier(identifier) {
			const scope = context.sourceCode.getScope(identifier);
			let current = scope;
			while (current) {
				const variable = current.set.get(identifier.name);
				if (variable) {
					const definition = variable.defs[0];
					if (
						definition?.node?.type === 'VariableDeclarator' &&
						definition.node.init
					) {
						return definition.node.init;
					}
					return null;
				}
				current = current.upper;
			}
			return null;
		}

		function checkObject(object) {
			for (const property of object.properties) {
				if (property.type === 'SpreadElement') {
					checkStyle(property.argument);
					continue;
				}
				const name = propertyName(property);
				if (name && BANNED_JS.test(camelCase(name))) {
					report(property, name);
				}
			}
		}

		function checkStyle(expression) {
			if (!expression) {
				return;
			}
			switch (expression.type) {
				case 'ObjectExpression':
					checkObject(expression);
					return;
				case 'ConditionalExpression':
					checkStyle(expression.consequent);
					checkStyle(expression.alternate);
					return;
				case 'LogicalExpression':
					checkStyle(expression.left);
					checkStyle(expression.right);
					return;
				case 'TSAsExpression':
				case 'TSSatisfiesExpression':
				case 'TSNonNullExpression':
				case 'ParenthesizedExpression':
					checkStyle(expression.expression);
					return;
				case 'CallExpression':
					// useMemo(() => ({ ... }), deps)
					if (
						expression.callee.type === 'Identifier' &&
						expression.callee.name === 'useMemo'
					) {
						checkReturned(expression.arguments[0]);
					}
					return;
				case 'Identifier': {
					const init = resolveIdentifier(expression);
					if (!init || followed.has(init)) {
						return;
					}
					followed.add(init);
					checkStyle(init);
					return;
				}
				default:
			}
		}

		function checkReturned(fn) {
			if (!fn || !FUNCTIONS.has(fn.type)) {
				return;
			}
			if (fn.body.type !== 'BlockStatement') {
				checkStyle(fn.body);
				return;
			}
			for (const statement of fn.body.body) {
				if (statement.type === 'ReturnStatement') {
					checkStyle(statement.argument);
				}
			}
		}

		function checkStyleMap(expression) {
			if (expression?.type !== 'ObjectExpression') {
				return;
			}
			for (const property of expression.properties) {
				if (property.type === 'Property') {
					checkStyle(property.value);
				}
			}
		}

		// `start` is the index of the first character after the opening quote.
		function checkCss(text, start) {
			for (const match of text.matchAll(BANNED_CSS)) {
				const index = start + match.index + match[1].length;
				if (reportedCss.has(index)) {
					continue;
				}
				reportedCss.add(index);
				context.report({
					loc: {
						start: context.sourceCode.getLocFromIndex(index),
						end: context.sourceCode.getLocFromIndex(index + match[2].length),
					},
					message: MESSAGE(match[2]),
				});
			}
		}

		// CSS returned from interpolations: ${(p) => p.small && 'font-size: 11px;'}
		function checkCssStrings(node) {
			if (!node || typeof node.type !== 'string') {
				return;
			}
			if (node.type === 'TemplateLiteral') {
				for (const quasi of node.quasis) {
					checkCss(quasi.value.raw, quasi.range[0] + 1);
				}
			} else if (node.type === 'Literal' && typeof node.value === 'string') {
				checkCss(node.raw.slice(1, -1), node.range[0] + 1);
				return;
			}
			for (const [key, value] of Object.entries(node)) {
				if (key === 'parent') {
					continue;
				}
				if (Array.isArray(value)) {
					value.forEach(checkCssStrings);
				} else if (value && typeof value === 'object') {
					checkCssStrings(value);
				}
			}
		}

		function checkFunction(node) {
			if (isCssPropertiesType(node.returnType?.typeAnnotation)) {
				checkReturned(node);
			}
		}

		return {
			JSXAttribute(node) {
				if (
					node.name.type !== 'JSXIdentifier' ||
					node.value?.type !== 'JSXExpressionContainer'
				) {
					return;
				}
				const name = node.name.name;
				if (name === 'styles') {
					checkStyleMap(node.value.expression);
				} else if (name === 'style' || name.endsWith('Style')) {
					checkStyle(node.value.expression);
				}
			},
			VariableDeclarator(node) {
				const type = node.id.typeAnnotation?.typeAnnotation;
				if (isCssPropertiesType(type)) {
					checkStyle(node.init);
				} else if (isCssPropertiesMapType(type)) {
					checkStyleMap(node.init);
				}
			},
			TSAsExpression(node) {
				if (isCssPropertiesType(node.typeAnnotation)) {
					checkStyle(node.expression);
				}
			},
			TSSatisfiesExpression(node) {
				if (isCssPropertiesType(node.typeAnnotation)) {
					checkStyle(node.expression);
				} else if (isCssPropertiesMapType(node.typeAnnotation)) {
					checkStyleMap(node.expression);
				}
			},
			TaggedTemplateExpression(node) {
				if (!isStyleTag(node.tag)) {
					return;
				}
				checkCssStrings(node.quasi);
			},
			ArrowFunctionExpression: checkFunction,
			FunctionExpression: checkFunction,
			FunctionDeclaration: checkFunction,
		};
	},
};
