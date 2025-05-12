import { Dispatch, SetStateAction } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

import logsUpdater from '../configs/logsUpdaterConfig';
import tracesUpdater from '../configs/tracesUpdaterConfig';
import { FormattingOptions } from '../types';

const metricsUpdater = {
	updateColumns: (): void => {}, // no-op for metrics
	updateFormatting: (): void => {}, // no-op for metrics
};

const updaterConfig: Record<
	DataSource,
	{
		updateColumns: (newColumns: BaseAutocompleteData[], mode: string) => void;
		updateFormatting: (newFormatting: FormattingOptions, mode: string) => void;
	}
> = {
	[DataSource.LOGS]: logsUpdater,
	[DataSource.TRACES]: tracesUpdater,
	[DataSource.METRICS]: metricsUpdater,
};

export function usePreferenceUpdater({
	dataSource,
	mode,
	setReSync,
}: {
	dataSource: DataSource;
	mode: string;
	setReSync: Dispatch<SetStateAction<number>>;
}): {
	updateColumns: (newColumns: BaseAutocompleteData[]) => void;
	updateFormatting: (newFormatting: FormattingOptions) => void;
} {
	const updater = updaterConfig[dataSource];

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
