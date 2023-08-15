import { FeatureKeys } from 'constants/features';

import { isFeatureKeys } from './utils';

describe('Feature Keys', () => {
	it('should return true for a valid feature key', () => {
		expect(isFeatureKeys(FeatureKeys.ALERT_CHANNEL_MSTEAMS)).toBe(true);
	});

	it('should return false for an invalid feature key', () => {
		expect(isFeatureKeys('invalid')).toBe(false);
	});
});
