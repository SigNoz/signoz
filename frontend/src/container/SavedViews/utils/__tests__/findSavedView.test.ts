import { SavedviewtypesSavedViewDTO } from 'api/generated/services/sigNoz.schemas';

import { findSavedView } from '../findSavedView';

describe('findSavedView', () => {
	const views = [{ id: 'a' }, { id: 'b' }] as SavedviewtypesSavedViewDTO[];

	it('returns the view with the matching id', () => {
		expect(findSavedView(views, 'b')?.id).toBe('b');
	});

	it('returns undefined when the id is not in the list', () => {
		expect(findSavedView(views, 'c')).toBeUndefined();
	});

	it('returns undefined for a null or not yet loaded list', () => {
		expect(findSavedView(null, 'a')).toBeUndefined();
		expect(findSavedView(undefined, 'a')).toBeUndefined();
	});
});
