import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';

import {
	isStaticPanelKind,
	isQueryTypeSupportedByPanelKind,
	isSignalSupported,
} from '../../../Panels/capabilities';
import type { PanelKind } from '../../../Panels/types/panelKind';

/** Kinds whose queries differ in shape, so neither converts into the other. */
const UNSWITCHABLE_KIND_PAIRS: ReadonlyArray<readonly [PanelKind, PanelKind]> =
	[['signoz/HistogramPanel', 'signoz/DistributionPanel']];

function isUnswitchablePair(from: PanelKind, to: PanelKind): boolean {
	return UNSWITCHABLE_KIND_PAIRS.some(
		([a, b]) => (a === from && b === to) || (a === to && b === from),
	);
}

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
 */
export function getPanelTypeDisabledReason({
	kind,
	fromKind,
	queryType,
	signal,
	label,
}: {
	kind: PanelKind;
	/** The panel's current kind; some pairs can't switch into each other. */
	fromKind?: PanelKind;
	queryType: EQueryType;
	signal?: TelemetrytypesSignalDTO;
	label: string;
}): string | undefined {
	if (fromKind && isUnswitchablePair(fromKind, kind)) {
		return "Histogram and Distribution query differently, so a panel can't switch between them";
	}
	// A kind that renders without a query pairs with anything — it declares no
	// query types or signals, and the checks below would read that as "supports
	// nothing" and disable it everywhere.
	if (isStaticPanelKind(kind)) {
		return undefined;
	}
	if (!isQueryTypeSupportedByPanelKind(kind, queryType)) {
		return `${label} isn't available for ${QUERY_TYPE_LABEL[queryType]} queries`;
	}
	if (signal !== undefined && !isSignalSupported(kind, signal)) {
		return `${label} doesn't support ${SIGNAL_LABEL[signal]} data`;
	}
	return undefined;
}
