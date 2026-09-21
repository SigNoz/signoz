import type { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';

import type { PanelQueryMode } from '../../Panels/types/queryModes';
import type { PanelKind } from '../../Panels/types/panelKind';
import type { LegendSeries } from 'pages/DashboardPage/DashboardContainer/Panels/utils/legendSeries';
import type { TableColumnOption } from '../hooks/useTableColumns';

/**
 * Context `SectionSlot` forwards to every section editor (not spec-slice fields — those
 * come from `SectionEditorProps<K>`); each editor `Pick`s what it consumes. All optional:
 * editors resolve through the kind-erased descriptor, so receipt isn't type-guaranteed.
 */
export interface SectionEditorContext {
	legendSeries?: LegendSeries[];
	tableColumns?: TableColumnOption[];
	signal?: TelemetrytypesSignalDTO;
	panelKind?: PanelKind;
	onChangePanelKind?: (kind: PanelKind) => void;
	yAxisUnit?: string;
	mode?: PanelQueryMode;
	stepInterval?: number;
	/** Unit the selected metric was sent with; drives the unit selector's mismatch warning. */
	metricUnit?: string;
	/** An editor registers the handler its header action (e.g. a quick-add "+") triggers; `null` to clear. */
	registerHeaderAction?: (handler: (() => void) | null) => void;
}
