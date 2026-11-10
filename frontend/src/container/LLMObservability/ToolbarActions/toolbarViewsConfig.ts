import {
	Atom,
	Binoculars,
	SquareMousePointer,
	Terminal,
} from '@signozhq/icons';
import { ExplorerViews } from 'pages/LogsExplorer/utils';

export interface ToolbarViewConfig {
	icon: typeof Atom;
	label: string;
	className: string;
	testId: string;
}

export const TOOLBAR_VIEW_CONFIG: Record<string, ToolbarViewConfig> = {
	[ExplorerViews.LIST]: {
		icon: SquareMousePointer,
		label: 'List View',
		className: 'list-view-tab',
		testId: 'search-view',
	},
	[ExplorerViews.TRACE]: {
		icon: SquareMousePointer,
		label: 'Trace View',
		className: 'trace-view-tab',
		testId: 'trace-view',
	},
	[ExplorerViews.TIMESERIES]: {
		icon: Atom,
		label: 'Time Series',
		className: 'timeseries-view-tab',
		testId: 'query-builder-view',
	},
	[ExplorerViews.CLICKHOUSE]: {
		icon: Terminal,
		label: 'Clickhouse',
		className: 'clickhouse-view-tab',
		testId: 'clickhouse-view',
	},
	[ExplorerViews.TABLE]: {
		icon: Binoculars,
		label: 'Table',
		className: 'table-view-tab',
		testId: 'query-builder-view-v2',
	},
};
