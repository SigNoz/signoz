import { Dispatch, SetStateAction } from 'react';
import { TelemetryFieldKey } from 'api/v5/v5';
import {
	defaultOptionsQuery,
	URL_OPTIONS,
} from 'container/OptionsMenu/constants';
import { OptionsQuery } from 'container/OptionsMenu/types';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { DataSource } from 'types/common/queryBuilder';

import getAIObservabilityTraceViewUpdaterConfig from '../configs/aiObservabilityTraceViewUpdaterConfig';
import getAIObservabilityUpdaterConfig from '../configs/aiObservabilityUpdaterConfig';
import getLogsUpdaterConfig from '../configs/logsUpdaterConfig';
import getTracesUpdaterConfig from '../configs/tracesUpdaterConfig';
import {
	AI_OBSERVABILITY_PREFERENCE_SOURCE,
	AI_OBSERVABILITY_TRACE_VIEW_PREFERENCE_SOURCE,
	AI_OBSERVABILITY_TRACE_VIEW_URL_OPTIONS,
	FormattingOptions,
	Preferences,
	PreferenceSource,
} from '../types';

const metricsUpdater = {
	updateColumns: (): void => {}, // no-op for metrics
	updateFormatting: (): void => {}, // no-op for metrics
};

const getUpdaterConfig = (
	preferences: Preferences | null,
	redirectWithOptionsData: (options: OptionsQuery) => void,
	setSavedViewPreferences: Dispatch<SetStateAction<Preferences | null>>,
): Record<
	PreferenceSource,
	{
		updateColumns: (newColumns: TelemetryFieldKey[], mode: string) => void;
		updateFormatting: (newFormatting: FormattingOptions, mode: string) => void;
	}
> => ({
	[DataSource.LOGS]: getLogsUpdaterConfig(
		preferences,
		redirectWithOptionsData,
		setSavedViewPreferences,
	),
	[DataSource.TRACES]: getTracesUpdaterConfig(
		redirectWithOptionsData,
		setSavedViewPreferences,
	),
	[DataSource.METRICS]: metricsUpdater,
	[AI_OBSERVABILITY_PREFERENCE_SOURCE]: getAIObservabilityUpdaterConfig(
		redirectWithOptionsData,
		setSavedViewPreferences,
	),
	[AI_OBSERVABILITY_TRACE_VIEW_PREFERENCE_SOURCE]:
		getAIObservabilityTraceViewUpdaterConfig(
			redirectWithOptionsData,
			setSavedViewPreferences,
		),
});

const getUrlOptionsKey = (dataSource: PreferenceSource): string =>
	dataSource === AI_OBSERVABILITY_TRACE_VIEW_PREFERENCE_SOURCE
		? AI_OBSERVABILITY_TRACE_VIEW_URL_OPTIONS
		: URL_OPTIONS;

export function usePreferenceUpdater({
	dataSource,
	mode,
	preferences,
	setReSync,
	setSavedViewPreferences,
}: {
	dataSource: PreferenceSource;
	mode: string;
	preferences: Preferences | null;
	setReSync: Dispatch<SetStateAction<boolean>>;
	setSavedViewPreferences: Dispatch<SetStateAction<Preferences | null>>;
}): {
	updateColumns: (newColumns: TelemetryFieldKey[]) => void;
	updateFormatting: (newFormatting: FormattingOptions) => void;
} {
	const { redirectWithQuery: redirectWithOptionsData } =
		useUrlQueryData<OptionsQuery>(
			getUrlOptionsKey(dataSource),
			defaultOptionsQuery,
		);
	const updater = getUpdaterConfig(
		preferences,
		redirectWithOptionsData,
		setSavedViewPreferences,
	)[dataSource];

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
