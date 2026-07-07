/**
 * Rule: no-unsupported-asset-pattern
 *
 * Enforces that all asset references (SVG, PNG, etc.) go through Vite's module
 * pipeline via ES imports (`import fooUrl from '@/assets/...'`) rather than
 * hard-coded strings or public/ paths.
 *
 * Why this matters: when the app is served from a sub-path (base-path deployment),
 * Vite rewrites ES import URLs automatically. String literals and public/ references
 * bypass that rewrite and break at runtime.
 *
 * Covers four AST patterns:
 *   1. Literal        — plain string: "/Icons/logo.svg"
 *   2. TemplateLiteral — template string: `/Icons/${name}.svg`
 *   3. BinaryExpression — concatenation: "/Icons/" + name + ".svg"
 *   4. ImportDeclaration / ImportExpression — static & dynamic imports
 */

import {
	hasAssetExtension,
	containsAssetExtension,
	extractUrlPath,
	isAbsolutePath,
	isPublicRelative,
	isRelativePublicDir,
	isValidAssetImport,
	isExternalUrl,
} from './shared/asset-patterns.mjs';

const PUBLIC_DIR_SEGMENTS = ['/Icons/', '/Images/', '/Logos/', '/svgs/'];

function collectBinaryStringParts(node) {
	if (node.type === 'Literal' && typeof node.value === 'string')
		return [node.value];
	if (node.type === 'BinaryExpression' && node.operator === '+') {
		return [
			...collectBinaryStringParts(node.left),
			...collectBinaryStringParts(node.right),
		];
	}
	if (node.type === 'TemplateLiteral') {
		return node.quasis.map((q) => q.value.raw);
	}
	return [null];
}

export default {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow Vite-unsafe asset reference patterns that break runtime base-path deployments',
			category: 'Asset Migration',
			recommended: true,
		},
		schema: [],
		messages: {
			absoluteString:
				'Absolute asset path "{{ value }}" is not base-path-safe. ' +
				"Use an ES import instead: import fooUrl from '@/assets/...' and reference the variable.",
			templateLiteral:
				'Dynamic asset path with absolute prefix is not base-path-safe. ' +
				"Use new URL('./asset.svg', import.meta.url).href for dynamic asset paths.",
			absoluteImport:
				'Asset imported via absolute path is not supported. ' +
				"Use import fooUrl from '@/assets/...' instead.",
			publicImport:
				"Assets in public/ bypass Vite's module pipeline — their URLs are not base-path-aware and will break when the app is served from a sub-path (e.g. /app/). " +
				"Use an ES import instead: import fooUrl from '@/assets/...' so Vite injects the correct base path.",
			relativePublicString:
				'Relative public-dir path "{{ value }}" is not base-path-safe. ' +
				"Use an ES import instead: import fooUrl from '@/assets/...' and reference the variable.",
			invalidAssetImport:
				"Asset '{{ src }}' must be imported from src/assets/ using either '@/assets/...' " +
				'or a relative path into src/assets/.',
		},
	},

	create(context) {
		return {
			Literal(node) {
				if (node.parent && node.parent.type === 'ImportDeclaration') {
					return;
				}
				const value = node.value;
				if (typeof value !== 'string') return;
				if (isExternalUrl(value)) return;

				if (isAbsolutePath(value) && containsAssetExtension(value)) {
					context.report({
						node,
						messageId: 'absoluteString',
						data: { value },
					});
					return;
				}

				if (isRelativePublicDir(value) && containsAssetExtension(value)) {
					context.report({
						node,
						messageId: 'relativePublicString',
						data: { value },
					});
					return;
				}

				if (isPublicRelative(value) && containsAssetExtension(value)) {
					context.report({
						node,
						messageId: 'relativePublicString',
						data: { value },
					});
					return;
				}

				const urlPath = extractUrlPath(value);
				if (urlPath && isExternalUrl(urlPath)) return;
				if (urlPath && isAbsolutePath(urlPath) && containsAssetExtension(urlPath)) {
					context.report({
						node,
						messageId: 'absoluteString',
						data: { value: urlPath },
					});
					return;
				}
				if (
					urlPath &&
					isRelativePublicDir(urlPath) &&
					containsAssetExtension(urlPath)
				) {
					context.report({
						node,
						messageId: 'relativePublicString',
						data: { value: urlPath },
					});
					return;
				}
				if (
					urlPath &&
					isPublicRelative(urlPath) &&
					containsAssetExtension(urlPath)
				) {
					context.report({
						node,
						messageId: 'relativePublicString',
						data: { value: urlPath },
					});
				}
			},

			TemplateLiteral(node) {
				const quasis = node.quasis;
				if (!quasis || quasis.length === 0) return;

				const firstQuasi = quasis[0].value.raw;
				if (isExternalUrl(firstQuasi)) return;

				const hasAssetExt = quasis.some((q) => containsAssetExtension(q.value.raw));

				if (isAbsolutePath(firstQuasi) && hasAssetExt) {
					context.report({
						node,
						messageId: 'templateLiteral',
					});
					return;
				}

				if (isRelativePublicDir(firstQuasi) && hasAssetExt) {
					context.report({
						node,
						messageId: 'relativePublicString',
						data: { value: firstQuasi },
					});
					return;
				}

				const hasPublicSegment = quasis.some((q) =>
					PUBLIC_DIR_SEGMENTS.some((seg) => q.value.raw.includes(seg)),
				);
				if (hasPublicSegment && hasAssetExt) {
					context.report({
						node,
						messageId: 'templateLiteral',
					});
					return;
				}

				if (quasis.length === 1) {
					if (isPublicRelative(firstQuasi) && hasAssetExt) {
						context.report({
							node,
							messageId: 'relativePublicString',
							data: { value: firstQuasi },
						});
						return;
					}

					const urlPath = extractUrlPath(firstQuasi);
					if (urlPath && isExternalUrl(urlPath)) return;
					if (urlPath && isAbsolutePath(urlPath) && hasAssetExtension(urlPath)) {
						context.report({
							node,
							messageId: 'templateLiteral',
						});
						return;
					}
					if (
						urlPath &&
						isRelativePublicDir(urlPath) &&
						hasAssetExtension(urlPath)
					) {
						context.report({
							node,
							messageId: 'relativePublicString',
							data: { value: urlPath },
						});
						return;
					}
					if (urlPath && isPublicRelative(urlPath) && hasAssetExtension(urlPath)) {
						context.report({
							node,
							messageId: 'relativePublicString',
							data: { value: urlPath },
						});
					}
					return;
				}

				if (firstQuasi.includes('url(') && hasAssetExt) {
					const urlMatch = firstQuasi.match(/^url\(\s*['"]?\//);
					if (urlMatch) {
						context.report({
							node,
							messageId: 'templateLiteral',
						});
					}
				}
			},

			BinaryExpression(node) {
				if (node.operator !== '+') return;

				const parts = collectBinaryStringParts(node);
				const prefixParts = [];
				for (const part of parts) {
					if (part === null) break;
					prefixParts.push(part);
				}
				const staticPrefix = prefixParts.join('');

				if (isExternalUrl(staticPrefix)) return;

				const hasExt = parts.some(
					(part) => part !== null && containsAssetExtension(part),
				);

				if (isAbsolutePath(staticPrefix) && hasExt) {
					context.report({
						node,
						messageId: 'templateLiteral',
					});
					return;
				}

				if (isPublicRelative(staticPrefix) && hasExt) {
					context.report({
						node,
						messageId: 'relativePublicString',
						data: { value: staticPrefix },
					});
					return;
				}

				if (isRelativePublicDir(staticPrefix) && hasExt) {
					context.report({
						node,
						messageId: 'relativePublicString',
						data: { value: staticPrefix },
					});
				}
			},

			ImportDeclaration(node) {
				const src = node.source.value;
				if (typeof src !== 'string') return;
				if (!hasAssetExtension(src)) return;

				if (isAbsolutePath(src)) {
					context.report({ node, messageId: 'absoluteImport' });
					return;
				}

				if (isPublicRelative(src)) {
					context.report({ node, messageId: 'publicImport' });
					return;
				}

				if (!isValidAssetImport(src)) {
					context.report({
						node,
						messageId: 'invalidAssetImport',
						data: { src },
					});
				}
			},

			ImportExpression(node) {
				const src = node.source;
				if (!src || src.type !== 'Literal' || typeof src.value !== 'string') return;
				const value = src.value;
				if (!hasAssetExtension(value)) return;

				if (isAbsolutePath(value)) {
					context.report({ node, messageId: 'absoluteImport' });
					return;
				}

				if (isPublicRelative(value)) {
					context.report({ node, messageId: 'publicImport' });
					return;
				}

				if (!isValidAssetImport(value)) {
					context.report({
						node,
						messageId: 'invalidAssetImport',
						data: { src: value },
					});
				}
			},
		};
	},
};
