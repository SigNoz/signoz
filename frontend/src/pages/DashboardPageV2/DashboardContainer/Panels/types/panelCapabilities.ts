import type { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import type { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';

/**
 * Query-builder field-visibility config a panel kind can declare, mirroring the
 * shape `QueryBuilderV2` consumes via its `filterConfigs` prop. Derived from that
 * prop type (the underlying `FilterConfigs` isn't exported) so the two never drift.
 */
export type FilterConfigsPartial = NonNullable<
	QueryBuilderProps['filterConfigs']
>;

/**
 * Per-signal query-builder field rules for a panel kind. `default` applies to every
 * signal; a per-signal entry is merged over it (signal wins). The capabilities guard
 * resolves this into a single `FilterConfigsPartial` via `getHiddenQueryBuilderFields`.
 */
export type QueryBuilderFieldRule = {
	default?: FilterConfigsPartial;
} & Partial<Record<TelemetrytypesSignalDTO, FilterConfigsPartial>>;
