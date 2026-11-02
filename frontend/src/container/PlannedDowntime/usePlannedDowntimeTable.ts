import { RefObject, useMemo } from 'react';
import type { AlertmanagertypesPlannedMaintenanceDTO } from 'api/generated/services/sigNoz.schemas';
import { sortByColumn } from 'components/Alerts/utils';
import type { SortState } from 'components/TanStackTableView/types';
import { useCalculatedPageSize } from 'components/TanStackTableView/useCalculatedPageSize';
import { useTableParams } from 'components/TanStackTableView/useTableParams';

import { getAlertOptionsFromIds } from './PlannedDowntimeutils';
import { DowntimeAlertOption, DowntimeSchedulesTableData } from './types';

export const PLANNED_DOWNTIME_QUERY_PARAMS = {
	orderBy: 'orderBy',
	page: 'page',
	limit: 'limit',
} as const;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const DEFAULT_SORT: SortState = { columnName: 'updatedAt', order: 'desc' };

const toTime = (value: string | undefined): number =>
	value ? new Date(value).getTime() : 0;

function getSortValue(
	downtime: DowntimeSchedulesTableData,
	columnName: string,
): string | number {
	switch (columnName) {
		case 'name':
			return downtime.name.toLowerCase();
		case 'status':
			return downtime.status;
		case 'window':
			return toTime(downtime.schedule?.startTime);
		case 'createdAt':
			return toTime(downtime.createdAt);
		case 'updatedAt':
			return toTime(downtime.updatedAt);
		default:
			return '';
	}
}

interface UsePlannedDowntimeTableReturn {
	containerRef: RefObject<HTMLDivElement>;
	calculatedPageSize: number | null;
	filteredDowntimes: DowntimeSchedulesTableData[];
	pagedDowntimes: DowntimeSchedulesTableData[];
	setPage: (page: number) => void;
	setLimit: (limit: number) => void;
}

function usePlannedDowntimeTable(
	downtimes: AlertmanagertypesPlannedMaintenanceDTO[],
	alertOptions: DowntimeAlertOption[],
	searchValue: string,
): UsePlannedDowntimeTableReturn {
	const { containerRef, calculatedPageSize } = useCalculatedPageSize({
		rowHeight: 46,
	});

	const { orderBy, page, limit, setLimit, setPage } = useTableParams(
		PLANNED_DOWNTIME_QUERY_PARAMS,
		{
			page: DEFAULT_PAGE,
			limit: DEFAULT_LIMIT,
			storageKey: 'planned-downtime',
			calculatedPageSize,
			cleanupOnUnmount: true,
		},
	);

	const filteredDowntimes = useMemo(() => {
		const search = searchValue.toLowerCase();
		return downtimes
			.filter(
				(downtime) =>
					downtime.name.toLowerCase().includes(search) ||
					downtime.id === searchValue,
			)
			.map((downtime) => ({
				...downtime,
				alertOptions: getAlertOptionsFromIds(downtime.alertIds || [], alertOptions),
			}));
	}, [downtimes, alertOptions, searchValue]);

	const pagedDowntimes = useMemo(() => {
		const sorted = sortByColumn(
			filteredDowntimes,
			orderBy,
			getSortValue,
			DEFAULT_SORT,
		);
		const start = (page - 1) * limit;
		return sorted.slice(start, start + limit);
	}, [filteredDowntimes, orderBy, page, limit]);

	return {
		containerRef,
		calculatedPageSize,
		filteredDowntimes,
		pagedDowntimes,
		setPage,
		setLimit,
	};
}

export default usePlannedDowntimeTable;
