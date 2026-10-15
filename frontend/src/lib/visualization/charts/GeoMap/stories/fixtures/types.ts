import { GeoMapPoint, SubdivisionCountry } from '../../types';

export type FixtureDataset =
	| 'errorRate'
	| 'errorRateAndRequests'
	| 'cityLatency'
	| 'cityLatencyAndRequests'
	| 'manyPoints'
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
	/** Two-metric datasets only: the value that sizes the bubble. */
	size?: number | null;
}

/** A dataset's second metric, drawn as bubble size. */
export interface FixtureSizeMetric {
	label: string;
	unit: 'percent' | 'count' | 'ms';
}

export interface Fixture {
	title: string;
	unit: 'percent' | 'count' | 'ms';
	rows: FixtureRow[];
	/** Point datasets only: rows placed by lat/lon, drawn on the points layer. */
	points?: GeoMapPoint[];
	/** Two-metric datasets only: names the colour metric. */
	valueLabel?: string;
	sizeMetric?: FixtureSizeMetric;
	/** State datasets only: whose states the rows name; drawn with the country view. */
	country?: SubdivisionCountry;
}
