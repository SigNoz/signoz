import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import { ViewProps } from 'types/api/saveViews/types';
import { DataSource } from 'types/common/queryBuilder';

export const viewMockData: ViewProps[] = [
	{
		uuid: 'view1',
		name: 'View 1',
		createdBy: 'User 1',
		category: 'category 1',
		compositeQuery: {} as ICompositeMetricQuery,
		createdAt: '2021-07-07T06:31:00.000Z',
		updatedAt: '2021-07-07T06:33:00.000Z',
		extraData: '',
		sourcePage: DataSource.TRACES,
		tags: [],
		updatedBy: 'User 1',
	},
	{
		uuid: 'view2',
		name: 'View 2',
		createdBy: 'User 2',
		category: 'category 2',
		compositeQuery: {} as ICompositeMetricQuery,
		createdAt: '2021-07-07T06:30:00.000Z',
		updatedAt: '2021-07-07T06:30:00.000Z',
		extraData: '',
		sourcePage: DataSource.TRACES,
		tags: [],
		updatedBy: 'User 2',
	},
];
