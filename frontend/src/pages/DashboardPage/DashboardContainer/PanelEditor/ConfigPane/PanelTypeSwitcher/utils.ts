import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';

import {
	isStaticPanelKind,
	isQueryModeSupportedByPanelKind,
	isSignalSupported,
} from '../../../Panels/capabilities';
import type { PanelKind } from '../../../Panels/types/panelKind';
import {
	AI_QUERY_MODE,
	type PanelQueryMode,
} from '../../../Panels/types/queryModes';

const QUERY_TYPE_LABEL: Record<EQueryType, string> = {
	[EQueryType.QUERY_BUILDER]: 'Query Builder',
	[EQueryType.CLICKHOUSE]: 'ClickHouse',
	[EQueryType.PROM]: 'PromQL',
};

const MODE_LABEL: Record<PanelQueryMode, string> = {
	...QUERY_TYPE_LABEL,
	[AI_QUERY_MODE]: 'AI Query Builder',
};

const SIGNAL_LABEL: Record<TelemetrytypesSignalDTO, string> = {
	[TelemetrytypesSignalDTO.logs]: 'logs',
	[TelemetrytypesSignalDTO.traces]: 'traces',
	[TelemetrytypesSignalDTO.metrics]: 'metrics',
	[TelemetrytypesSignalDTO['']]: '',
};

/**
 * Why a panel kind can't be selected for the current query type / signal, or
 * `undefined` when it can. Drives both the type switcher's disabled state and its
 * tooltip, so the two never disagree. The query-type reason takes precedence (it's the
 * outer choice): query types carry no signal, so the signal only matters in builder.
 */
export function getPanelTypeDisabledReason({
	kind,
	mode,
	signal,
	label,
}: {
	kind: PanelKind;
	mode: PanelQueryMode;
	signal?: TelemetrytypesSignalDTO;
	label: string;
}): string | undefined {
	// A kind that renders without a query pairs with anything — it declares no
	// query types or signals, and the checks below would read that as "supports
	// nothing" and disable it everywhere.
	if (isStaticPanelKind(kind)) {
		return undefined;
	}
	if (!isQueryModeSupportedByPanelKind(kind, mode)) {
		return `${label} isn't available for ${MODE_LABEL[mode]} queries`;
	}
	if (signal !== undefined && !isSignalSupported(kind, signal, mode)) {
		return `${label} doesn't support ${SIGNAL_LABEL[signal]} data`;
	}
	return undefined;
}
