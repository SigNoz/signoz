import {
	DashboardtypesQueryDTO,
	DashboardtypesQueryPluginDTO,
	Querybuildertypesv5RequestTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import type { QueryEnvelope } from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';

// Maps a panel type to the v5 request kind its query envelope expects:
// - LIST panels (rows-oriented data — logs and traces alike) request `raw`.
// - VALUE / TABLE / PIE panels render a single aggregated figure, so they
//   request `scalar`.
// - Every other panel type requests `time_series`.
export function deriveOuterKind(
	graphType: PANEL_TYPES,
): Querybuildertypesv5RequestTypeDTO {
	switch (graphType) {
		case PANEL_TYPES.LIST:
			return Querybuildertypesv5RequestTypeDTO.raw;
		case PANEL_TYPES.VALUE:
		case PANEL_TYPES.TABLE:
		case PANEL_TYPES.PIE:
			return Querybuildertypesv5RequestTypeDTO.scalar;
		default:
			return Querybuildertypesv5RequestTypeDTO.time_series;
	}
}

// fromPerses always returns this fully-inflated empty composite shape so the
// QB UI never has to branch on "is the builder hydrated yet."
export function makeEmptyV1Query(): Query {
	return {
		id: '',
		queryType: EQueryType.QUERY_BUILDER,
		promql: [],
		clickhouse_sql: [],
		builder: {
			queryData: [],
			queryFormulas: [],
			queryTraceOperator: [],
		},
	};
}

// Inner plugin kinds that wrap a single v5 envelope spec (no further nesting).
// CompositeQuery is excluded — it has its own wrapper (`wrapComposite`).
export type BarePluginKind =
	| 'signoz/BuilderQuery'
	| 'signoz/Formula'
	| 'signoz/TraceOperator'
	| 'signoz/PromQLQuery'
	| 'signoz/ClickHouseSQL';

// Packages a single v5 envelope spec into the perses outer DTO with the
// specified inner plugin kind. The one cast per call bridges the structurally-
// identical-but-nominally-distinct local v5 / generated perses type pair.
export function wrapBare(
	outerKind: Querybuildertypesv5RequestTypeDTO,
	pluginKind: BarePluginKind,
	envelope: QueryEnvelope,
): DashboardtypesQueryDTO {
	return {
		kind: outerKind,
		spec: {
			plugin: {
				kind: pluginKind,
				spec: envelope.spec,
			} as unknown as DashboardtypesQueryPluginDTO,
		},
	};
}

// Packages a list of v5 envelopes into a perses `signoz/CompositeQuery` DTO.
// Used when V1 has multi-query, formula, or trace-operator content — anything
// the bare wrapper kinds can't represent.
export function wrapComposite(
	outerKind: Querybuildertypesv5RequestTypeDTO,
	envelopes: QueryEnvelope[],
): DashboardtypesQueryDTO {
	return {
		kind: outerKind,
		spec: {
			plugin: {
				kind: 'signoz/CompositeQuery',
				spec: { queries: envelopes },
			} as unknown as DashboardtypesQueryPluginDTO,
		},
	};
}
