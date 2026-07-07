/**
 * Oxlint custom rules plugin for SigNoz.
 *
 * This plugin aggregates all custom SigNoz linting rules.
 * Individual rules are defined in the ./rules directory.
 */

import noZustandGetStateInHooks from './rules/no-zustand-getstate-in-hooks.mjs';
import noNavigatorClipboard from './rules/no-navigator-clipboard.mjs';
import noUnsupportedAssetPattern from './rules/no-unsupported-asset-pattern.mjs';
import noRawAbsolutePath from './rules/no-raw-absolute-path.mjs';
import noAntdComponents from './rules/no-antd-components.mjs';
import noSignozhqUiBarrel from './rules/no-signozhq-ui-barrel.mjs';
import noCssModuleBracketAccess from './rules/no-css-module-bracket-access.mjs';
import noDashboardFetchOutsideRoot from './rules/no-dashboard-fetch-outside-root.mjs';
import noGetByText from './rules/no-getByText.mjs';
import noFireEvent from './rules/no-fireEvent.mjs';
import noRawHtmlTextElements from './rules/no-raw-html-text-elements.mjs';
import noMultipleComponents from './rules/no-multiple-components.mjs';
import noInlineHelpers from './rules/no-inline-helpers.mjs';
import maxComponentLines from './rules/max-component-lines.mjs';

export default {
	meta: {
		name: 'signoz',
	},
	rules: {
		'no-zustand-getstate-in-hooks': noZustandGetStateInHooks,
		'no-navigator-clipboard': noNavigatorClipboard,
		'no-unsupported-asset-pattern': noUnsupportedAssetPattern,
		'no-raw-absolute-path': noRawAbsolutePath,
		'no-antd-components': noAntdComponents,
		'no-signozhq-ui-barrel': noSignozhqUiBarrel,
		'no-css-module-bracket-access': noCssModuleBracketAccess,
		'no-dashboard-fetch-outside-root': noDashboardFetchOutsideRoot,
		'no-getByText': noGetByText,
		'no-fireEvent': noFireEvent,
		'no-raw-html-text-elements': noRawHtmlTextElements,
		'no-multiple-components': noMultipleComponents,
		'no-inline-helpers': noInlineHelpers,
		'max-component-lines': maxComponentLines,
	},
};
