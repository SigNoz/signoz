import { Layout } from 'react-grid-layout';
import { UseQueryResult } from 'react-query';
import dayjs from 'dayjs';
import { SuccessResponseV2 } from 'types/api';
import { Dashboard } from 'types/api/dashboard/getAll';

export type WidgetColumnWidths = {
	[widgetId: string]: Record<string, number>;
};

export interface IDashboardContext {
	isDashboardLocked: boolean;
	handleDashboardLockToggle: (value: boolean) => void;
	dashboardResponse: UseQueryResult<SuccessResponseV2<Dashboard>, unknown>;
	selectedDashboard: Dashboard | undefined;
	layouts: Layout[];
	panelMap: Record<string, { widgets: Layout[]; collapsed: boolean }>;
	setPanelMap: React.Dispatch<React.SetStateAction<Record<string, any>>>;
	setLayouts: React.Dispatch<React.SetStateAction<Layout[]>>;
	setSelectedDashboard: React.Dispatch<
		React.SetStateAction<Dashboard | undefined>
	>;
	updatedTimeRef: React.MutableRefObject<dayjs.Dayjs | null>;
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
		isDynamic?: boolean,
	) => void;
	dashboardQueryRangeCalled: boolean;
	setDashboardQueryRangeCalled: (value: boolean) => void;
	isDashboardFetching: boolean;
	columnWidths: WidgetColumnWidths;
	setColumnWidths: React.Dispatch<React.SetStateAction<WidgetColumnWidths>>;
}
