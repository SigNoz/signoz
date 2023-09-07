import { Dashboard } from 'types/api/dashboard/getAll';

import { Data } from '..';

export const getTableDataOnFilteredData = (data?: Dashboard[]): Data[] =>
	data?.map((e) => ({
		createdBy: e.created_at,
		description: e.data.description || '',
		id: e.uuid,
		lastUpdatedTime: e.updated_at,
		name: e.data.title,
		tags: e.data.tags || [],
		key: e.uuid,
	})) || [];
