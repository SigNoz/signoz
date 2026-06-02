import type {
	DashboardtypesQueryDTO,
	DashboardtypesQueryPluginDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import type { QueryEnvelope } from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

// Outer envelope `kind` values used by the perses dashboard format. The Go
// backend defines `Query.Kind` as a free-form string, but the only values
// observed in `pkg/types/dashboardtypes/testdata` are these two.
export type PersesOuterKind = 'TimeSeriesQuery' | 'LogQuery';

// LIST panels (rows-oriented data — logs and traces alike) use LogQuery.
// Every other panel type uses TimeSeriesQuery.
export function deriveOuterKind(graphType: PANEL_TYPES): PersesOuterKind {
	return graphType === PANEL_TYPES.LIST ? 'LogQuery' : 'TimeSeriesQuery';
}

// v5 builder query carries `signal` as a literal union; V1 in-memory uses the
// DataSource enum. These two helpers bridge the two sides.
export type V5Signal = 'logs' | 'metrics' | 'traces';

export function signalToDataSource(signal: V5Signal): DataSource {
	if (signal === 'logs') {
		return DataSource.LOGS;
	}
	if (signal === 'traces') {
		return DataSource.TRACES;
	}
	return DataSource.METRICS;
}

export function dataSourceToSignal(dataSource: DataSource): V5Signal {
	if (dataSource === DataSource.LOGS) {
		return 'logs';
	}
	if (dataSource === DataSource.TRACES) {
		return 'traces';
	}
	return 'metrics';
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
	outerKind: PersesOuterKind,
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
	outerKind: PersesOuterKind,
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
