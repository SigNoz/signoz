// Write a test for getUpdatedStepInterval function in src/container/FormAlertRules/utils.ts

import { getUpdatedStepInterval } from './utils';

describe('getUpdatedStepInterval', () => {
	it('should return 60', () => {
		const result = getUpdatedStepInterval('5m0s');
		expect(result).toEqual(60);
	});
	it('should return 60 for 10m0s', () => {
		const result = getUpdatedStepInterval('10m0s');
		expect(result).toEqual(60);
	});
});
