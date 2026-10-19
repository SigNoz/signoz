import { kit } from '../kit';

import {
	withMetrics,
	withMetricsExplorer,
	withSavedViews,
	withVolumeControl,
} from './driver';
import { withMetricsCatalog } from './seeds';

/** The metrics-explorer `test`: summary, explorer, views and volume control. */
export const test = withMetricsCatalog(
	withMetrics(withMetricsExplorer(withSavedViews(withVolumeControl(kit)))),
);

export {
	allowFor,
	expect,
	SEEDED_DATA_TIMEOUT,
	SEEDED_TEST_BUDGET,
} from '../kit';
export { isQueryRange, metricsExplorerDriver, toast } from './driver';
export type {
	MetricMetadata,
	MetricsExplorer,
	ReductionRule,
	StatsRequest,
	TreemapRequest,
} from './driver';
export type { MetricsCatalogSeed } from './seeds';
