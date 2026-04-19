'use strict';

/**
 * ESLint rule: no-unsupported-asset-pattern
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

const {
	hasAssetExtension,
	containsAssetExtension,
	extractUrlPath,
	isAbsolutePath,
	isPublicRelative,
	isRelativePublicDir,
	isValidAssetImport,
	isExternalUrl,
} = require('./shared/asset-patterns');

// Known public/ sub-directories that should never appear in dynamic asset paths.
const PUBLIC_DIR_SEGMENTS = ['/Icons/', '/Images/', '/Logos/', '/svgs/'];

/**
 * Recursively extracts the static string parts from a binary `+` expression or
 * template literal.  Returns `[null]` for any dynamic (non-string) node so
 * callers can detect that the prefix became unknowable.
 *
 * Example: `"/Icons/" + iconName + ".svg"` → ["/Icons/", null, ".svg"]
 */
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
	// Unknown / dynamic node — signals "prefix is no longer fully static"
	return [null];
}

module.exports = {
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
			/**
			 * Catches plain string literals used as asset paths, e.g.:
			 *   src="/Icons/logo.svg"   or   url("../public/Images/bg.png")
			 *
			 * Import declaration sources are skipped here — handled by ImportDeclaration.
			 * Also unwraps CSS `url(...)` wrappers before checking.
			 */
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

				// Catches relative paths that start with "public/" e.g. 'public/Logos/aws-dark.svg'.
				// isRelativePublicDir only covers known sub-dirs (Icons/, Logos/, etc.),
				// so this handles the case where the full "public/" prefix is written explicitly.
				if (isPublicRelative(value) && containsAssetExtension(value)) {
					context.report({
						node,
						messageId: 'relativePublicString',
						data: { value },
					});
					return;
				}

				// Also check the path inside a CSS url("...") wrapper
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

			/**
			 * Catches template literals used as asset paths, e.g.:
			 *   `/Icons/${name}.svg`
			 *   `url('/Images/${bg}.png')`
			 */
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

				// Expression-first template with known public-dir segment: `${base}/Icons/foo.svg`
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

				// No-interpolation template (single quasi): treat like a plain string
				// and also unwrap any css url(...) wrapper.
				if (quasis.length === 1) {
					// Check the raw string first (no url() wrapper)
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

				// CSS url() with an absolute path inside a multi-quasi template, e.g.:
				//   `url('/Icons/${name}.svg')`
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

			/**
			 * Catches string concatenation used to build asset paths, e.g.:
			 *   "/Icons/" + name + ".svg"
			 *
			 * Collects the leading static parts (before the first dynamic value)
			 * to determine the path prefix. If any part carries a known asset
			 * extension, the expression is flagged.
			 */
			BinaryExpression(node) {
				if (node.operator !== '+') return;

				const parts = collectBinaryStringParts(node);
				// Collect only the leading static parts; stop at the first dynamic (null) part
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

			/**
			 * Catches static asset imports that don't go through src/assets/, e.g.:
			 *   import logo from '/public/Icons/logo.svg'   ← absolute path
			 *   import logo from '../../public/logo.svg'    ← relative into public/
			 *   import logo from '../somewhere/logo.svg'    ← outside src/assets/
			 *
			 * Valid pattern: import fooUrl from '@/assets/...' or relative within src/assets/
			 */
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

			/**
			 * Same checks as ImportDeclaration but for dynamic imports:
			 *   const logo = await import('/Icons/logo.svg')
			 *
			 * Only literal sources are checked; fully dynamic expressions are ignored
			 * since their paths cannot be statically analysed.
			 */
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
