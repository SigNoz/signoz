import { SubdivisionCountry } from '../../types';

export type FixtureDataset =
	| 'errorRate'
	| 'requests'
	| 'europeLatency'
	| 'usStates'
	| 'indiaStates';

export interface FixtureRow {
	/** Group-by value exactly as a query would return it (country, or state for state datasets). */
	raw: string | null;
	/** State datasets only: the separate country column GeoIP emits beside the region. */
	country?: string | null;
	value: number;
}

export interface Fixture {
	title: string;
	unit: 'percent' | 'count' | 'ms';
	rows: FixtureRow[];
	/** State datasets only: whose states the rows name; drawn with the country view. */
	country?: SubdivisionCountry;
}
