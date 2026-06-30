import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';

import {
	isQueryTypeSupported,
	isSignalSupported,
} from '../../../Panels/capabilities';
import type { PanelKind } from '../../../Panels/types/panelKind';

const QUERY_TYPE_LABEL: Record<EQueryType, string> = {
	[EQueryType.QUERY_BUILDER]: 'Query Builder',
	[EQueryType.CLICKHOUSE]: 'ClickHouse',
	[EQueryType.PROM]: 'PromQL',
};

const SIGNAL_LABEL: Record<TelemetrytypesSignalDTO, string> = {
	[TelemetrytypesSignalDTO.logs]: 'logs',
	[TelemetrytypesSignalDTO.traces]: 'traces',
	[TelemetrytypesSignalDTO.metrics]: 'metrics',
};

/**
 * Why a panel kind can't be selected for the current query type / signal, or
 * `undefined` when it can. Drives both the type switcher's disabled state and its
 * tooltip, so the two never disagree. The query-type reason takes precedence (it's the
 * outer choice): query types carry no signal, so the signal only matters in builder.
 */
export function getPanelTypeDisabledReason({
	kind,
	queryType,
	signal,
	label,
}: {
	kind: PanelKind;
	queryType: EQueryType;
	signal?: TelemetrytypesSignalDTO;
	label: string;
}): string | undefined {
	if (!isQueryTypeSupported(kind, queryType)) {
		return `${label} isn't available for ${QUERY_TYPE_LABEL[queryType]} queries`;
	}
	if (signal !== undefined && !isSignalSupported(kind, signal)) {
		return `${label} doesn't support ${SIGNAL_LABEL[signal]} data`;
	}
	return undefined;
}
