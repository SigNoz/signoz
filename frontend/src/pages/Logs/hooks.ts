import { ItemType } from 'antd/es/menu/hooks/useItems';
// utils
import get from 'api/browser/localstorage/get';
// interfaces
import { LogViewMode } from 'container/LogsTable';
import { useCallback, useLayoutEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLinesPerRow } from 'store/actions/logs/setLInesPerRow';
// actions
import { setViewMode } from 'store/actions/logs/setViewMode';
import { AppState } from 'store/reducers';

import { LOGS_LINES_PER_ROW, LOGS_VIEW_MODE } from './utils';

type ViewModeOption = ItemType & {
	label: string;
	value: LogViewMode;
};

const viewModeOptionList: ViewModeOption[] = [
	{
		key: 'raw',
		label: 'Raw',
		value: 'raw',
	},
	{
		key: 'table',
		label: 'Table',
		value: 'table',
	},
	{
		key: 'list',
		label: 'List',
		value: 'list',
	},
];

type SelectedLogViewData = {
	viewModeOptionList: ViewModeOption[];
	viewModeOption: ViewModeOption;
	viewMode: LogViewMode;
	handleViewModeChange: (s: LogViewMode) => void;
	handleViewModeOptionChange: ({ key }: { key: string }) => void;
	linesPerRow: number;
	handleLinesPerRowChange: (l: unknown) => void;
};

export const useSelectedLogView = (): SelectedLogViewData => {
	const dispatch = useDispatch();
	const viewMode = useSelector<AppState, LogViewMode>(
		(state) => state.logs.viewMode,
	);
	const linesPerRow = useSelector<AppState, number>(
		(state) => state.logs.linesPerRow,
	);

	const viewModeOption = useMemo(() => {
		return (
			viewModeOptionList.find(
				(viewModeOption) => viewModeOption.value === viewMode,
			) ?? viewModeOptionList[0]
		);
	}, [viewMode]);

	const handleViewModeChange = useCallback(
		(selectedViewMode: LogViewMode) => {
			dispatch(setViewMode(selectedViewMode));
		},
		[dispatch],
	);

	const handleViewModeOptionChange = useCallback(
		({ key }: { key: string }) => {
			handleViewModeChange(key as LogViewMode);
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
		const storedViewMode = get(LOGS_VIEW_MODE);
		if (storedViewMode) {
			handleViewModeChange(storedViewMode as LogViewMode);
		}

		const storedLinesPerRow = get(LOGS_LINES_PER_ROW);
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
