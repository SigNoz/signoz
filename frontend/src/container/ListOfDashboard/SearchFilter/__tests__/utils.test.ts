import { Dashboard } from 'types/api/dashboard/getAll';
import { v4 as uuid } from 'uuid';

import { TOperator } from '../types';
import { executeSearchQueries } from '../utils';

describe('executeSearchQueries', () => {
	const firstDashboard: Dashboard = {
		id: 11111,
		uuid: uuid(),
		created_at: '',
		updated_at: '',
		created_by: '',
		updated_by: '',
		data: {
			title: 'first dashboard',
			variables: {},
		},
	};
	const secondDashboard: Dashboard = {
		id: 22222,
		uuid: uuid(),
		created_at: '',
		updated_at: '',
		created_by: '',
		updated_by: '',
		data: {
			title: 'second dashboard',
			variables: {},
		},
	};
	const thirdDashboard: Dashboard = {
		id: 333333,
		uuid: uuid(),
		created_at: '',
		updated_at: '',
		created_by: '',
		updated_by: '',
		data: {
			title: 'third dashboard (with special characters +?\\)',
			variables: {},
		},
	};
	const dashboards = [firstDashboard, secondDashboard, thirdDashboard];

	it('should filter dashboards based on title', () => {
		const query = {
			category: 'title',
			id: 'someid',
			operator: '=' as TOperator,
			value: 'first dashboard',
		};

		expect(executeSearchQueries([query], dashboards)).toEqual([firstDashboard]);
	});

	it('should filter dashboards with special characters', () => {
		const query = {
			category: 'title',
			id: 'someid',
			operator: '=' as TOperator,
			value: 'third dashboard (with special characters +?\\)',
		};

		expect(executeSearchQueries([query], dashboards)).toEqual([thirdDashboard]);
	});
});
