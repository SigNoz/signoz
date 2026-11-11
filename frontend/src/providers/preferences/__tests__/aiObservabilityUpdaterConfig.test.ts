import { TelemetryFieldKey } from 'api/v5/v5';
import { PANEL_TYPES } from 'constants/queryBuilder';

import getAiObservabilityUpdaterConfig from '../configs/aiObservabilityUpdaterConfig';
import { PreferenceMode } from '../types';

const columns = [{ name: 'total_tokens' }] as TelemetryFieldKey[];

describe('aiObservabilityUpdaterConfig in saved view mode', () => {
	it('stores the columns under the open panel', () => {
		const setSavedViewPreferences = jest.fn();
		const { updateColumns } = getAiObservabilityUpdaterConfig(
			jest.fn(),
			setSavedViewPreferences,
			PANEL_TYPES.TRACE,
		);

		updateColumns(columns, PreferenceMode.SAVED_VIEW);

		expect(setSavedViewPreferences).toHaveBeenCalledWith({
			columns,
			panelType: PANEL_TYPES.TRACE,
		});
	});

	it('stores the columns under the given panel', () => {
		const setSavedViewPreferences = jest.fn();
		const { updateColumns } = getAiObservabilityUpdaterConfig(
			jest.fn(),
			setSavedViewPreferences,
			PANEL_TYPES.LIST,
		);

		updateColumns(columns, PreferenceMode.SAVED_VIEW, PANEL_TYPES.TRACE);

		expect(setSavedViewPreferences).toHaveBeenCalledWith({
			columns,
			panelType: PANEL_TYPES.TRACE,
		});
	});
});
