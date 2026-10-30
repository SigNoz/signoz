import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';

import { isPreferenceSourcePage } from '../utils';

describe('isPreferenceSourcePage', () => {
	it.each([SavedviewtypesSourceDTO.logs, SavedviewtypesSourceDTO.traces])(
		'is true for %s',
		(source) => {
			expect(isPreferenceSourcePage(source)).toBe(true);
		},
	);

	it.each([
		SavedviewtypesSourceDTO.metrics,
		SavedviewtypesSourceDTO.meter,
		SavedviewtypesSourceDTO.ai_observability,
	])('is false for %s', (source) => {
		expect(isPreferenceSourcePage(source)).toBe(false);
	});
});
