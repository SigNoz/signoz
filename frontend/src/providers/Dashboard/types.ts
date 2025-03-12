import dayjs from 'dayjs';
import { Layout } from 'react-grid-layout';
import { UseQueryResult } from 'react-query';
import { Dashboard } from 'types/api/dashboard/getAll';

export interface DashboardSortOrder {
	columnKey: string;
	order: string;
	pagination: string;
	search: string;
}

export interface IDashboardContext {
	isDashboardSliderOpen: boolean;
	isDashboardLocked: boolean;
	handleToggleDashboardSlider: (value: boolean) => void;
	handleDashboardLockToggle: (value: boolean) => void;
	dashboardResponse: UseQueryResult<Dashboard, unknown>;
	selectedDashboard: Dashboard | undefined;
	dashboardId: string;
	layouts: Layout[];
	panelMap: Record<string, { widgets: Layout[]; collapsed: boolean }>;
	setPanelMap: React.Dispatch<React.SetStateAction<Record<string, any>>>;
	listSortOrder: DashboardSortOrder;
	setListSortOrder: (sortOrder: DashboardSortOrder) => void;
	setLayouts: React.Dispatch<React.SetStateAction<Layout[]>>;
	setSelectedDashboard: React.Dispatch<
		React.SetStateAction<Dashboard | undefined>
	>;
	updatedTimeRef: React.MutableRefObject<dayjs.Dayjs | null>;
	toScrollWidgetId: string;
	setToScrollWidgetId: React.Dispatch<React.SetStateAction<string>>;
	updateLocalStorageDashboardVariables: (
		id: string,
		selectedValue:
			| string
			| number
			| boolean
			| (string | number | boolean)[]
			| null
			| undefined,
		allSelected: boolean,
	) => void;
	variablesToGetUpdated: string[];
	setVariablesToGetUpdated: React.Dispatch<React.SetStateAction<string[]>>;
	dashboardQueryRangeCalled: boolean;
	setDashboardQueryRangeCalled: (value: boolean) => void;
	selectedRowWidgetId: string | null;
	setSelectedRowWidgetId: React.Dispatch<React.SetStateAction<string | null>>;
	isDashboardFetching: boolean;
}
