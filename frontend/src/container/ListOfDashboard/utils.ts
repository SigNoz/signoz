import { Dashboard, DashboardTemplate } from 'types/api/dashboard/getAll';

export const filterDashboard = (
	searchValue: string,
	dashboardList: Dashboard[],
): Dashboard[] => {
	const searchValueLowerCase = searchValue?.toLowerCase();

	// Filter by title, description, tags
	return dashboardList.filter((item: Dashboard) => {
		const { title, description, tags } = item.data;
		const itemValuesNew = [title, description];

		if (tags && tags.length > 0) {
			itemValuesNew.push(...tags);
		}

		// Check if any property value contains the searchValue
		return itemValuesNew.some((value) => {
			if (value) {
				return value.toLowerCase().includes(searchValueLowerCase);
			}

			return false;
		});
	});
};

export const filterTemplates = (
	searchValue: string,
	dashboardList: DashboardTemplate[],
): DashboardTemplate[] => {
	const searchValueLowerCase = searchValue?.toLowerCase();

	return dashboardList.filter((item: DashboardTemplate) => {
		const { name } = item;

		// Check if any property value contains the searchValue
		return name.toLowerCase().includes(searchValueLowerCase);
	});
};

export interface DashboardDynamicColumns {
	createdAt: boolean;
	createdBy: boolean;
	updatedAt: boolean;
	updatedBy: boolean;
}

export enum DynamicColumns {
	CREATED_AT = 'createdAt',
	CREATED_BY = 'createdBy',
	UPDATED_AT = 'updatedAt',
	UPDATED_BY = 'updatedBy',
}
