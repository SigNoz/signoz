import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';

import {
	isQueryTypeSupportedByPanelKind,
	isSignalSupported,
	supportsAIQuery,
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
	[TelemetrytypesSignalDTO['']]: '',
};

/**
 * Why a panel kind can't be selected for the current query type / signal, or
 * `undefined` when it can. Drives both the type switcher's disabled state and its
 * tooltip, so the two never disagree. The query-type reason takes precedence (it's the
 * outer choice): query types carry no signal, so the signal only matters in builder.
 *
 * AI is checked first of all: an AI query is a builder query on traces, so it clears
 * both of the other gates on kinds that can't carry one (List can't — the wire format
 * has no place for the envelope tag there, see its `supportsAIQuery`).
 */
export function getPanelTypeDisabledReason({
	kind,
	queryType,
	signal,
	label,
	isAIQuery = false,
}: {
	kind: PanelKind;
	queryType: EQueryType;
	signal?: TelemetrytypesSignalDTO;
	label: string;
	/** Whether the panel currently holds an AI query. */
	isAIQuery?: boolean;
}): string | undefined {
	if (isAIQuery && !supportsAIQuery(kind)) {
		return `${label} isn't available for AI queries`;
	}
	if (!isQueryTypeSupportedByPanelKind(kind, queryType)) {
		return `${label} isn't available for ${QUERY_TYPE_LABEL[queryType]} queries`;
	}
	if (signal !== undefined && !isSignalSupported(kind, signal)) {
		return `${label} doesn't support ${SIGNAL_LABEL[signal]} data`;
	}
	return undefined;
}
