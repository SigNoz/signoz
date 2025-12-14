/* eslint-disable sonarjs/cognitive-complexity */
import { TelemetryFieldKey } from 'api/v5/v5';
import { defaultLogsSelectedColumns } from 'container/OptionsMenu/constants';
import { defaultSelectedColumns as defaultTracesSelectedColumns } from 'container/TracesExplorer/ListView/configs';
import { useGetAllViews } from 'hooks/saveViews/useGetAllViews';
import { useEffect, useState } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import { usePreferenceLoader } from '../loader/usePreferenceLoader';
import { FormattingOptions, PreferenceMode, Preferences } from '../types';
import { usePreferenceUpdater } from '../updater/usePreferenceUpdater';

export function usePreferenceSync({
	mode,
	dataSource,
	savedViewId,
}: {
	mode: PreferenceMode;
	dataSource: DataSource;
	savedViewId: string | undefined;
}): {
	preferences: Preferences | null;
	loading: boolean;
	error: Error | null;
	updateColumns: (newColumns: TelemetryFieldKey[]) => void;
	updateFormatting: (newFormatting: FormattingOptions) => void;
} {
	const { data: viewsData } = useGetAllViews(
		dataSource,
		mode === PreferenceMode.SAVED_VIEW,
	);

	const [
		savedViewPreferences,
		setSavedViewPreferences,
	] = useState<Preferences | null>(null);

	const updateExtraDataSelectColumns = (
		columns: TelemetryFieldKey[],
	): TelemetryFieldKey[] | null => {
		if (!columns) return null;
		return columns.map((column) => ({
			...column,
			name: column.name ?? column.key,
		}));
	};

	useEffect(() => {
		const extraData = viewsData?.data?.data?.find(
			(view) => view.id === savedViewId,
		)?.extraData;

		const parsedExtraData = JSON.parse(extraData || '{}');
		let columns: TelemetryFieldKey[] = [];
		let formatting: FormattingOptions | undefined;
		if (dataSource === DataSource.LOGS) {
			columns =
				updateExtraDataSelectColumns(parsedExtraData?.selectColumns) ||
				defaultLogsSelectedColumns;
			formatting = {
				maxLines: parsedExtraData?.maxLines ?? 2,
				format: parsedExtraData?.format ?? 'table',
				fontSize: parsedExtraData?.fontSize ?? 'small',
				version: parsedExtraData?.version ?? 1,
			};
		}
		if (dataSource === DataSource.TRACES) {
			columns = parsedExtraData?.selectColumns || defaultTracesSelectedColumns;
		}
		setSavedViewPreferences({ columns, formatting });
	}, [viewsData, dataSource, savedViewId, mode]);

	// We are using a reSync state because we have URL updates as well as local storage updates
	// and we want to make sure we are always using the latest preferences
	const [reSync, setReSync] = useState(false);
	const { preferences, loading, error } = usePreferenceLoader({
		dataSource,
		reSync,
		setReSync,
	});

	const { updateColumns, updateFormatting } = usePreferenceUpdater({
		dataSource,
		mode,
		preferences,
		setReSync,
		setSavedViewPreferences,
	});

	return {
		preferences:
			mode === PreferenceMode.SAVED_VIEW && savedViewId
				? savedViewPreferences
				: preferences,
		loading,
		error,
		updateColumns,
		updateFormatting,
	};
}
