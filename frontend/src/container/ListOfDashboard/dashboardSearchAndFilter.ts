import { Dashboard } from 'types/api/dashboard/getAll';

interface IDashboardSearchData {
	title: string;
	description: string | undefined;
	tags: string[];
	id: string;
}

export const generateSearchData = (
	dashboards: Dashboard[],
): IDashboardSearchData[] => {
	const dashboardSearchData: IDashboardSearchData[] = [];

	dashboards.forEach((dashboard) => {
		dashboardSearchData.push({
			id: dashboard.uuid,
			title: dashboard.data.title,
			description: dashboard.data.description,
			tags: dashboard.data.tags || [],
		});
	});
	return dashboardSearchData;
};
