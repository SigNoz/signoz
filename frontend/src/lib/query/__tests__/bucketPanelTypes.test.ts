import { PANEL_TYPES } from 'constants/queryBuilder';

import { isBucketPanelType } from '../bucketPanelTypes';

describe('isBucketPanelType', () => {
	it('is true for heatmap and distribution only', () => {
		expect(isBucketPanelType(PANEL_TYPES.HEATMAP)).toBe(true);
		expect(isBucketPanelType(PANEL_TYPES.DISTRIBUTION)).toBe(true);
		expect(isBucketPanelType(PANEL_TYPES.HISTOGRAM)).toBe(false);
		expect(isBucketPanelType(PANEL_TYPES.TIME_SERIES)).toBe(false);
		expect(isBucketPanelType(null)).toBe(false);
	});
});
