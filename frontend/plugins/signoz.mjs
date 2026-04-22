/**
 * Oxlint custom rules plugin for SigNoz.
 *
 * This plugin aggregates all custom SigNoz linting rules.
 * Individual rules are defined in the ./rules directory.
 */

import noZustandGetStateInHooks from './rules/no-zustand-getstate-in-hooks.mjs';
import noNavigatorClipboard from './rules/no-navigator-clipboard.mjs';
import noUnsupportedAssetPattern from './rules/no-unsupported-asset-pattern.mjs';

export default {
	meta: {
		name: 'signoz',
	},
	rules: {
		'no-zustand-getstate-in-hooks': noZustandGetStateInHooks,
		'no-navigator-clipboard': noNavigatorClipboard,
		'no-unsupported-asset-pattern': noUnsupportedAssetPattern,
	},
};
