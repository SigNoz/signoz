import { Dayjs } from 'dayjs';
import { Dispatch, SetStateAction } from 'react';
import { Layout } from 'react-grid-layout';
import { UseQueryResult } from 'react-query';
import { Dashboard } from 'types/api/dashboard/getAll';

export interface DashboardSortOrder {
	columnKey?: string | null;
	order?: string | null;
	pagination?: string;
	search?: string;
}

export interface WidgetColumnWidths {
	[key: string]: Record<string, number>;
}

export interface IDashboardContext {
	isDashboardSliderOpen: boolean;
	isDashboardLocked: boolean;
	handleToggleDashboardSlider: (value: boolean) => void;
	handleDashboardLockToggle: (value: boolean) => Promise<void>;
	dashboardResponse: UseQueryResult<Dashboard, unknown>;
	selectedDashboard: Dashboard;
	dashboardId: string;
	layouts: Layout[];
	panelMap: Record<string, { widgets: Layout[]; collapsed: boolean }>;
	setPanelMap: Dispatch<
		SetStateAction<Record<string, { widgets: Layout[]; collapsed: boolean }>>
	>;
	listSortOrder: DashboardSortOrder;
	setListSortOrder: (value: DashboardSortOrder) => void;
	setLayouts: Dispatch<SetStateAction<Layout[]>>;
	setSelectedDashboard: Dispatch<SetStateAction<Dashboard | undefined>>;
	updatedTimeRef: React.MutableRefObject<Dayjs | null>;
	toScrollWidgetId: string;
	setToScrollWidgetId: Dispatch<SetStateAction<string>>;
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
	setVariablesToGetUpdated: Dispatch<SetStateAction<string[]>>;
	dashboardQueryRangeCalled: boolean;
	setDashboardQueryRangeCalled: Dispatch<SetStateAction<boolean>>;
	selectedRowWidgetId: string | null;
	setSelectedRowWidgetId: Dispatch<SetStateAction<string | null>>;
	isDashboardFetching: boolean;
	columnWidths: WidgetColumnWidths;
	setColumnWidths: Dispatch<SetStateAction<WidgetColumnWidths>>;
	// Global custom data state
	globalCustomDataMode: boolean;
	setGlobalCustomDataMode: Dispatch<SetStateAction<boolean>>;
	globalCustomXData: number;
	setGlobalCustomXData: Dispatch<SetStateAction<number>>;
	globalCustomYData: number;
	setGlobalCustomYData: Dispatch<SetStateAction<number>>;
}
