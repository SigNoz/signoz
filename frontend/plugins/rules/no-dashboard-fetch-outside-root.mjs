/**
 * Rule: no-dashboard-fetch-outside-root
 *
 * `useDashboardFetch` owns the V2 dashboard fetch and exposes its loading/error/refetch
 * lifecycle. That lifecycle is a root-page concern: DashboardPageV2 and PanelEditorPage
 * gate their subtree on a resolved dashboard before mounting anything below them.
 *
 * Every other component therefore renders inside an already-loaded subtree and must use
 * `useDashboardFetchRequired`, which reuses the same react-query cache entry but guarantees
 * a non-undefined dashboard (throwing otherwise) — so consumers don't re-handle states the
 * root page already owns.
 *
 * This rule flags `useDashboardFetch` imports. It is disabled via an override in
 * .oxlintrc.json for the two root pages and for useDashboardFetchRequired.ts (which wraps it).
 */

const FETCH_HOOK = 'useDashboardFetch';

export default {
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Disallow useDashboardFetch outside the root dashboard pages; use useDashboardFetchRequired instead',
			category: 'Dashboard V2',
		},
		schema: [],
		messages: {
			useRequired:
				'Use useDashboardFetchRequired() instead of useDashboardFetch — the latter is reserved for the root pages (DashboardPageV2, PanelEditorPage) that own the fetch lifecycle. Components below them render inside a loaded subtree and should assume a guaranteed dashboard.',
		},
	},

	create(context) {
		return {
			ImportDeclaration(node) {
				node.specifiers.forEach((specifier) => {
					if (
						specifier.type === 'ImportSpecifier' &&
						specifier.imported.name === FETCH_HOOK
					) {
						context.report({ node: specifier, messageId: 'useRequired' });
					}
				});
			},
		};
	},
};
