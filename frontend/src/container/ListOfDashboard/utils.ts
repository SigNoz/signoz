import { Dashboard } from 'types/api/dashboard/getAll';

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
