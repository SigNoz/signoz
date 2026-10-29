import { Dispatch, SetStateAction } from 'react';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { TelemetryFieldKey } from 'api/v5/v5';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	defaultOptionsQuery,
	URL_OPTIONS,
} from 'container/OptionsMenu/constants';
import { OptionsQuery } from 'container/OptionsMenu/types';
import useUrlQueryData from 'hooks/useUrlQueryData';

import getAiObservabilityUpdaterConfig from '../configs/aiObservabilityUpdaterConfig';
import getLogsUpdaterConfig from '../configs/logsUpdaterConfig';
import getTracesUpdaterConfig from '../configs/tracesUpdaterConfig';
import { FormattingOptions, Preferences, PreferenceSourcePage } from '../types';

const getUpdaterConfig = (
	preferences: Preferences | null,
	redirectWithOptionsData: (options: OptionsQuery) => void,
	setSavedViewPreferences: Dispatch<SetStateAction<Preferences | null>>,
	panelType: PANEL_TYPES | undefined,
): Record<
	PreferenceSourcePage,
	{
		updateColumns: (newColumns: TelemetryFieldKey[], mode: string) => void;
		updateFormatting: (newFormatting: FormattingOptions, mode: string) => void;
	}
> => ({
	[SavedviewtypesSourceDTO.logs]: getLogsUpdaterConfig(
		preferences,
		redirectWithOptionsData,
		setSavedViewPreferences,
	),
	[SavedviewtypesSourceDTO.traces]: getTracesUpdaterConfig(
		redirectWithOptionsData,
		setSavedViewPreferences,
	),
	[SavedviewtypesSourceDTO.ai_observability]: getAiObservabilityUpdaterConfig(
		redirectWithOptionsData,
		setSavedViewPreferences,
		panelType,
	),
});

export function usePreferenceUpdater({
	sourcePage,
	panelType,
	mode,
	preferences,
	setReSync,
	setSavedViewPreferences,
}: {
	sourcePage: PreferenceSourcePage;
	panelType?: PANEL_TYPES;
	mode: string;
	preferences: Preferences | null;
	setReSync: Dispatch<SetStateAction<boolean>>;
	setSavedViewPreferences: Dispatch<SetStateAction<Preferences | null>>;
}): {
	updateColumns: (newColumns: TelemetryFieldKey[]) => void;
	updateFormatting: (newFormatting: FormattingOptions) => void;
} {
	const { redirectWithQuery: redirectWithOptionsData } =
		useUrlQueryData<OptionsQuery>(URL_OPTIONS, defaultOptionsQuery);
	const updater = getUpdaterConfig(
		preferences,
		redirectWithOptionsData,
		setSavedViewPreferences,
		panelType,
	)[sourcePage];

	return {
		updateColumns: (newColumns: TelemetryFieldKey[]): void => {
			updater.updateColumns(newColumns, mode);
			setReSync(true);
		},
		updateFormatting: (newFormatting: FormattingOptions): void => {
			updater.updateFormatting(newFormatting, mode);
			setReSync(true);
		},
	};
}
