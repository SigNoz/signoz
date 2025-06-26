import { ColumnType } from 'antd/lib/table';
import { QueryParams } from 'constants/query';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import createQueryParams from 'lib/createQueryParams';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom-v5-compat';

import { getContextMenuConfig } from './contextConfig';

interface ClickedData {
	record: RowData;
	column: ColumnType<RowData>;
}

interface UseTableContextMenuProps {
	widgetId: string;
	clickedData: ClickedData | null;
	onClose: () => void;
	coordinates: { x: number; y: number } | null;
}

export function useTableContextMenu({
	widgetId,
	clickedData,
	onClose,
	coordinates,
}: UseTableContextMenuProps): {
	menuItemsConfig: { header?: string; items?: React.ReactNode };
} {
	const { pathname, search } = useLocation();
	const { safeNavigate } = useSafeNavigate();

	const onColumnClick = useCallback((): void => {
		const queryParams = {
			[QueryParams.expandedWidgetId]: widgetId,
		};
		const updatedSearch = createQueryParams(queryParams);
		const existingSearch = new URLSearchParams(search);
		const isExpandedWidgetIdPresent = existingSearch.has(
			QueryParams.expandedWidgetId,
		);
		if (isExpandedWidgetIdPresent) {
			existingSearch.delete(QueryParams.expandedWidgetId);
		}
		const separator = existingSearch.toString() ? '&' : '';
		const newSearch = `${existingSearch}${separator}${updatedSearch}`;

		safeNavigate({
			pathname,
			search: newSearch,
		});
		onClose();
	}, [widgetId, search, pathname, safeNavigate, onClose]);

	const menuItemsConfig = useMemo(() => {
		if (coordinates) {
			return getContextMenuConfig(clickedData, 'table', onColumnClick);
		}
		return {};
	}, [clickedData, onColumnClick, coordinates]);

	return { menuItemsConfig };
}

export default useTableContextMenu;
