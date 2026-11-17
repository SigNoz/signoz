import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';

import { hasPreferences, isPreferenceSourcePage } from '../utils';

describe('isPreferenceSourcePage', () => {
	it.each([
		SavedviewtypesSourceDTO.logs,
		SavedviewtypesSourceDTO.traces,
		SavedviewtypesSourceDTO.ai_observability,
	])('is true for %s', (source) => {
		expect(isPreferenceSourcePage(source)).toBe(true);
	});

	it.each([SavedviewtypesSourceDTO.metrics, SavedviewtypesSourceDTO.meter])(
		'is false for %s',
		(source) => {
			expect(isPreferenceSourcePage(source)).toBe(false);
		},
	);
});

describe('hasPreferences', () => {
	it('is true for every panel of the logs and traces explorers', () => {
		expect(
			hasPreferences(SavedviewtypesSourceDTO.traces, PANEL_TYPES.TRACE),
		).toBe(true);
		expect(hasPreferences(SavedviewtypesSourceDTO.logs, PANEL_TYPES.LIST)).toBe(
			true,
		);
	});

	it('is true only for the AI observability panels that keep columns', () => {
		expect(
			hasPreferences(SavedviewtypesSourceDTO.ai_observability, PANEL_TYPES.TRACE),
		).toBe(true);
		expect(
			hasPreferences(SavedviewtypesSourceDTO.ai_observability, PANEL_TYPES.LIST),
		).toBe(true);
		expect(
			hasPreferences(
				SavedviewtypesSourceDTO.ai_observability,
				PANEL_TYPES.TIME_SERIES,
			),
		).toBe(false);
	});

	it('is false for source pages without a slice', () => {
		expect(
			hasPreferences(SavedviewtypesSourceDTO.metrics, PANEL_TYPES.LIST),
		).toBe(false);
	});
});
