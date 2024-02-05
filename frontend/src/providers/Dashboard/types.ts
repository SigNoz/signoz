import dayjs from 'dayjs';
import { Layout } from 'react-grid-layout';
import { UseQueryResult } from 'react-query';
import { Dashboard } from 'types/api/dashboard/getAll';

export interface IDashboardContext {
	isDashboardSliderOpen: boolean;
	isDashboardLocked: boolean;
	handleToggleDashboardSlider: (value: boolean) => void;
	handleDashboardLockToggle: (value: boolean) => void;
	dashboardResponse: UseQueryResult<Dashboard, unknown>;
	selectedDashboard: Dashboard | undefined;
	dashboardId: string;
	layouts: Layout[];
	setLayouts: React.Dispatch<React.SetStateAction<Layout[]>>;
	setSelectedDashboard: React.Dispatch<
		React.SetStateAction<Dashboard | undefined>
	>;
	updatedTimeRef: React.MutableRefObject<dayjs.Dayjs | null>;
	toScrollWidgetId: string;
	setToScrollWidgetId: React.Dispatch<React.SetStateAction<string>>;
}
