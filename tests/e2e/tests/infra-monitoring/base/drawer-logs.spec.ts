/**
 * B-LOG — the drawer's Logs tab, on the entities whose config enables it.
 *
 * The tab is always scoped to the entity: `getInitialLogTracesExpression`
 * produces a filter the user cannot edit away, and anything they type is
 * combined with it rather than replacing it.
 *
 * Every scenario here is shared with B-TRC and lives in `drawer-query-tab.ts`.
 */

import { describeQueryTab } from './drawer-query-tab';

describeQueryTab({
	tab: 'logs',
	tag: 'B-LOG',
	capability: 'logsTab',
	sampleExpression: "severity_text = 'ERROR'",
	explorerPath: '/logs/logs-explorer',
	filtersParam: 'logFilters',
});
