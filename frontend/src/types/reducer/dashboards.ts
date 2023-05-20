import { PayloadProps } from 'types/api/dashboard/getAll';

export default interface DashboardReducer {
	dashboards: PayloadProps;
	loading: boolean;
	error: boolean;
	errorMessage: string;
	isEditMode: boolean;
	isQueryFired: boolean;
	isAddWidget: boolean;
	isLoadingQueryResult: boolean;
}
