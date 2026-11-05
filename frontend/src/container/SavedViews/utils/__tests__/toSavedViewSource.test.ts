import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { DataSource } from 'types/common/queryBuilder';

import { toSavedViewSource } from '../toSavedViewSource';

describe('toSavedViewSource', () => {
	it('maps every explorer source page to the v2 source', () => {
		expect(toSavedViewSource(DataSource.LOGS)).toBe(SavedviewtypesSourceDTO.logs);
		expect(toSavedViewSource(DataSource.TRACES)).toBe(
			SavedviewtypesSourceDTO.traces,
		);
		expect(toSavedViewSource(DataSource.METRICS)).toBe(
			SavedviewtypesSourceDTO.metrics,
		);
		expect(toSavedViewSource('meter')).toBe(SavedviewtypesSourceDTO.meter);
	});
});
