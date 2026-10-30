import type { ReactNode } from 'react';
import type { AlertmanagertypesPlannedMaintenanceDTO } from 'api/generated/services/sigNoz.schemas';
import type { TableColumnDef } from 'components/TanStackTableView';
import type { SelectOption } from 'types/common/select';

export type DowntimeAlertOption = Omit<
	SelectOption<string | number | null, ReactNode>,
	'value'
> & {
	value?: string | number | null;
};

export type DowntimeSchedulesTableData =
	AlertmanagertypesPlannedMaintenanceDTO & {
		alertOptions: DowntimeAlertOption[];
	};

export interface PlannedDowntimeListProps {
	columns: TableColumnDef<DowntimeSchedulesTableData>[];
	downtimes: DowntimeSchedulesTableData[];
	pagedDowntimes: DowntimeSchedulesTableData[];
	calculatedPageSize: number | null;
	onLimitChange: (limit: number) => void;
	isFetching: boolean;
	isError: boolean;
	refetch: () => void;
	canEdit: boolean;
	onEdit: (downtime: DowntimeSchedulesTableData) => void;
	onDelete: (downtime: DowntimeSchedulesTableData) => void;
	onCreate: () => void;
	hasSearchTerm: boolean;
	onClearSearch: () => void;
}
