import { PANEL_TYPES } from 'constants/queryBuilder';

import { isBucketCountingPanelType } from '../bucketCountingPanelTypes';

describe('isBucketCountingPanelType', () => {
	it('is true for heatmap and distribution only', () => {
		expect(isBucketCountingPanelType(PANEL_TYPES.HEATMAP)).toBe(true);
		expect(isBucketCountingPanelType(PANEL_TYPES.DISTRIBUTION)).toBe(true);
		expect(isBucketCountingPanelType(PANEL_TYPES.HISTOGRAM)).toBe(false);
		expect(isBucketCountingPanelType(PANEL_TYPES.TIME_SERIES)).toBe(false);
		expect(isBucketCountingPanelType(null)).toBe(false);
	});
});
