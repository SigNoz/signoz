import { Querybuildertypesv5RequestTypeDTO } from 'api/generated/services/sigNoz.schemas';

import type { PanelQueryCapabilities } from '../../types/panelCapabilities';
import { buildDefaultQueries } from '../buildDefaultQueries';

// What a plotted kind and a list-view kind declare. Passed in rather than resolved from
// the registry, which would pull every panel renderer into this suite.
const PLOTTED_CAPS: PanelQueryCapabilities = {
	requestType: Querybuildertypesv5RequestTypeDTO.time_series,
	formatTableResultForUI: false,
	bucketedStepInterval: false,
	orderTiebreaker: false,
	serverPaginated: false,
	listView: false,
	traceOperator: true,
};
const LIST_CAPS: PanelQueryCapabilities = {
	...PLOTTED_CAPS,
	requestType: Querybuildertypesv5RequestTypeDTO.raw,
	orderTiebreaker: true,
	serverPaginated: true,
	listView: true,
	traceOperator: false,
};

describe('buildDefaultQueries', () => {
	it('seeds a list view with a runnable logs query ordered by timestamp desc', () => {
		const queries = buildDefaultQueries('signoz/ListPanel', LIST_CAPS);

		expect(queries).toHaveLength(1);
		// orderBy timestamp desc must survive serialization so the preview opens
		// pre-sorted (V1 parity).
		const serialized = JSON.stringify(queries);
		expect(serialized).toContain('timestamp');
		expect(serialized).toContain('desc');
		expect(serialized.toLowerCase()).toContain('logs');
	});

	it('seeds a list view without a limit so it pages server-side by default', () => {
		const queries = buildDefaultQueries('signoz/ListPanel', LIST_CAPS);

		// A limit would make usePanelQuery treat the panel as a static, unpaged list.
		const spec = queries[0].spec.plugin.spec as { limit?: number };
		expect(spec.limit).toBeUndefined();
	});

	it('seeds no query for plotted kinds (they seed from the builder)', () => {
		expect(
			buildDefaultQueries('signoz/TimeSeriesPanel', PLOTTED_CAPS),
		).toStrictEqual([]);
		expect(buildDefaultQueries('signoz/NumberPanel', PLOTTED_CAPS)).toStrictEqual(
			[],
		);
	});
});
