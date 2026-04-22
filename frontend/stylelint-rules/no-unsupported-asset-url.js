/**
 * Stylelint rule: local/no-unsupported-asset-url
 *
 * Disallows asset URLs in CSS `url()` declarations that are not base-path-safe.
 * When SigNoz is served from a sub-path (e.g. /app/), absolute and public-dir
 * relative paths break because they bypass Vite's module pipeline and don't get
 * the runtime base-path prefix.
 *
 * Flagged patterns:
 *   - Absolute paths:          url('/icons/logo.svg')
 *   - Public-relative paths:   url('../public/icons/logo.svg')
 *   - Public-dir segments:     url('Icons/logo.svg')  (resolves from public/)
 *
 * Required pattern (base-path-safe):
 *   - src/assets ES import:    import logo from '../../assets/icons/logo.svg'
 *                              then reference via the imported variable in JS/TS.
 *   - Relative from src/assets in SCSS: url('../../assets/icons/logo.svg')
 *
 * See: https://vitejs.dev/guide/assets  (Static Asset Handling)
 */
import stylelint from 'stylelint';
import {
	containsAssetExtension,
	isAbsolutePath,
	isPublicRelative,
	isRelativePublicDir,
} from '../plugins/rules/shared/asset-patterns.mjs';

const ruleName = 'local/no-unsupported-asset-url';

/**
 * Extracts all url() inner path strings from a CSS declaration value.
 * Handles single-quoted, double-quoted, and unquoted url() forms.
 * e.g. "url('/a.svg') url('/b.png') repeat" → ['/a.svg', '/b.png']
 */
function extractUrlPaths(value) {
	if (typeof value !== 'string') return [];
	const paths = [];
	const urlPattern = /url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g;
	let match = urlPattern.exec(value);
	while (match !== null) {
		paths.push(match[1]);
		match = urlPattern.exec(value);
	}
	return paths;
}

const meta = {};

const messages = stylelint.utils.ruleMessages(ruleName, {
	absolutePath: (urlPath) =>
		`Absolute asset path "${urlPath}" in url() is not base-path-safe. ` +
		`Use a relative path from src/assets/ instead: url('../../assets/...')`,
	publicPath: () =>
		`Assets in public/ bypass Vite's module pipeline — their URLs are not base-path-aware and will break when the app is served from a sub-path (e.g. /app/). ` +
		`Use a relative path from src/assets/ instead: url('../../assets/...')`,
	relativePath: (urlPath) =>
		`Relative public-dir path "${urlPath}" in url() is not base-path-safe. ` +
		`Use a relative path from src/assets/ instead: url('../../assets/...')`,
});

/**
 * Rule implementation. Walks every CSS declaration in the file and checks
 * each url() path against three forbidden patterns (absolute, public-relative,
 * public-dir segment). Reports a violation with a fix hint for each match.
 *
 * `primaryOption` is the value from the stylelint config — the rule is a no-op
 * when falsy (i.e. `"local/no-unsupported-asset-url": [false]`).
 *
 * @type {import('stylelint').Rule}
 */
const rule = (primaryOption) => {
	return (root, result) => {
		if (!primaryOption) return;

		root.walkDecls((decl) => {
			const urlPaths = extractUrlPaths(decl.value);

			for (const urlPath of urlPaths) {
				// Pattern #1: absolute path with asset extension
				if (isAbsolutePath(urlPath) && containsAssetExtension(urlPath)) {
					stylelint.utils.report({
						message: messages.absolutePath(urlPath),
						node: decl,
						result,
						ruleName,
					});
					continue;
				}

				// Pattern #2: relative path into public/ with asset extension
				if (isPublicRelative(urlPath) && containsAssetExtension(urlPath)) {
					stylelint.utils.report({
						message: messages.publicPath(),
						node: decl,
						result,
						ruleName,
					});
					continue;
				}

				// Pattern #3: relative public-dir segment, e.g. url('Icons/foo.svg')
				if (isRelativePublicDir(urlPath) && containsAssetExtension(urlPath)) {
					stylelint.utils.report({
						message: messages.relativePath(urlPath),
						node: decl,
						result,
						ruleName,
					});
				}
			}
		});
	};
};

rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = meta;

export { ruleName, rule, meta };
export default { ruleName, rule, meta };
