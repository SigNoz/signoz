import type { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';

import type { PanelKind } from '../../Panels/types/panelKind';
import type { LegendSeries } from '../hooks/useLegendSeries';
import type { TableColumnOption } from '../hooks/useTableColumns';
import { EQueryType } from 'types/common/dashboard';

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
	queryType?: EQueryType;
	stepInterval?: number;
}
