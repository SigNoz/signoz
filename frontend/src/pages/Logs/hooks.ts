// utils
import get from 'api/browser/localstorage/get';
import { LOCALSTORAGE } from 'constants/localStorage';
// interfaces
import { LogViewMode } from 'container/LogsTable';
import { useCallback, useLayoutEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLinesPerRow } from 'store/actions/logs/setLInesPerRow';
// actions
import { setViewMode } from 'store/actions/logs/setViewMode';
import { AppState } from 'store/reducers';

import { viewModeOptionList } from './config';
import { SelectedLogViewData } from './types';
import { isLogViewMode } from './utils';

export const useSelectedLogView = (): SelectedLogViewData => {
	const dispatch = useDispatch();
	const viewMode = useSelector<AppState, LogViewMode>(
		(state) => state.logs.viewMode,
	);
	const linesPerRow = useSelector<AppState, number>(
		(state) => state.logs.linesPerRow,
	);

	const viewModeOption = useMemo(
		() =>
			viewModeOptionList.find(
				(viewModeOption) => viewModeOption.value === viewMode,
			) ?? viewModeOptionList[0],
		[viewMode],
	);

	const handleViewModeChange = useCallback(
		(selectedViewMode: LogViewMode) => {
			dispatch(setViewMode(selectedViewMode));
		},
		[dispatch],
	);

	const handleViewModeOptionChange = useCallback(
		({ key }: { key: string }) => {
			if (isLogViewMode(key)) handleViewModeChange(key);
		},
		[handleViewModeChange],
	);

	const handleLinesPerRowChange = useCallback(
		(selectedLinesPerRow: unknown) => {
			if (typeof selectedLinesPerRow === 'number') {
				dispatch(setLinesPerRow(selectedLinesPerRow));
			}
		},
		[dispatch],
	);

	useLayoutEffect(() => {
		const storedViewMode = get(LOCALSTORAGE.LOGS_VIEW_MODE);
		if (storedViewMode) {
			handleViewModeChange(storedViewMode as LogViewMode);
		}

		const storedLinesPerRow = get(LOCALSTORAGE.LOGS_LINES_PER_ROW);
		if (storedLinesPerRow) {
			handleLinesPerRowChange(+storedLinesPerRow);
		}
	}, [handleViewModeChange, handleLinesPerRowChange]);

	return {
		viewModeOptionList,
		viewModeOption,
		viewMode,
		handleViewModeChange,
		handleViewModeOptionChange,
		linesPerRow,
		handleLinesPerRowChange,
	};
};
