import {
	defaultOptionsQuery,
	URL_OPTIONS,
} from 'container/OptionsMenu/constants';
import { OptionsQuery } from 'container/OptionsMenu/types';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { Dispatch, SetStateAction } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

import getLogsUpdaterConfig from '../configs/logsUpdaterConfig';
import tracesUpdater from '../configs/tracesUpdaterConfig';
import { FormattingOptions, Preferences } from '../types';

const metricsUpdater = {
	updateColumns: (): void => {}, // no-op for metrics
	updateFormatting: (): void => {}, // no-op for metrics
};

const getUpdaterConfig = (
	redirectWithOptionsData: (options: OptionsQuery) => void,
	setSavedViewPreferences: Dispatch<SetStateAction<Preferences | null>>,
): Record<
	DataSource,
	{
		updateColumns: (newColumns: BaseAutocompleteData[], mode: string) => void;
		updateFormatting: (newFormatting: FormattingOptions, mode: string) => void;
	}
> => ({
	[DataSource.LOGS]: getLogsUpdaterConfig(
		redirectWithOptionsData,
		setSavedViewPreferences,
	),
	[DataSource.TRACES]: tracesUpdater,
	[DataSource.METRICS]: metricsUpdater,
});

export function usePreferenceUpdater({
	dataSource,
	mode,
	setReSync,
	setSavedViewPreferences,
}: {
	dataSource: DataSource;
	mode: string;
	setReSync: Dispatch<SetStateAction<number>>;
	setSavedViewPreferences: Dispatch<SetStateAction<Preferences | null>>;
}): {
	updateColumns: (newColumns: BaseAutocompleteData[]) => void;
	updateFormatting: (newFormatting: FormattingOptions) => void;
} {
	const {
		redirectWithQuery: redirectWithOptionsData,
	} = useUrlQueryData<OptionsQuery>(URL_OPTIONS, defaultOptionsQuery);
	const updater = getUpdaterConfig(
		redirectWithOptionsData,
		setSavedViewPreferences,
	)[dataSource];

	return {
		updateColumns: (newColumns: BaseAutocompleteData[]): void => {
			updater.updateColumns(newColumns, mode);
			setReSync((prev: number) => prev + 1);
		},
		updateFormatting: (newFormatting: FormattingOptions): void => {
			updater.updateFormatting(newFormatting, mode);
			setReSync((prev: number) => prev + 1);
		},
	};
}
