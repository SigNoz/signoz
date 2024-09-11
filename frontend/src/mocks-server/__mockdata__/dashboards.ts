/* eslint-disable sonarjs/no-duplicate-string */
export const dashboardSuccessResponse = {
	status: 'success',
	data: [
		{
			id: 1,
			uuid: '1',
			created_at: '2022-11-16T13:29:47.064874419Z',
			created_by: null,
			updated_at: '2024-05-21T06:41:30.546630961Z',
			updated_by: 'thor@avengers.io',
			isLocked: 0,
			data: {
				collapsableRowsMigrated: true,
				description: '',
				name: '',
				panelMap: {},
				tags: ['linux'],
				title: 'thor',
				uploadedGrafana: false,
				uuid: '',
				version: '',
			},
		},
		{
			id: 2,
			uuid: '2',
			created_at: '2022-11-16T13:20:47.064874419Z',
			created_by: null,
			updated_at: '2024-05-21T06:42:30.546630961Z',
			updated_by: 'captain-america@avengers.io',
			isLocked: 0,
			data: {
				collapsableRowsMigrated: true,
				description: '',
				name: '',
				panelMap: {},
				tags: ['linux'],
				title: 'captain america',
				uploadedGrafana: false,
				uuid: '',
				version: '',
			},
		},
	],
};

export const dashboardEmptyState = {
	status: 'sucsess',
	data: [],
};

export const getDashboardById = {
	status: 'success',
	data: {
		id: 1,
		uuid: '1',
		created_at: '2022-11-16T13:29:47.064874419Z',
		created_by: 'integration',
		updated_at: '2024-05-21T06:41:30.546630961Z',
		updated_by: 'thor@avengers.io',
		isLocked: true,
		data: {
			collapsableRowsMigrated: true,
			description: '',
			name: '',
			panelMap: {},
			tags: ['linux'],
			title: 'thor',
			uploadedGrafana: false,
			uuid: '',
			version: '',
			variables: {},
		},
	},
};

export const getNonIntegrationDashboardById = {
	status: 'success',
	data: {
		id: 1,
		uuid: '1',
		created_at: '2022-11-16T13:29:47.064874419Z',
		created_by: 'thor',
		updated_at: '2024-05-21T06:41:30.546630961Z',
		updated_by: 'thor@avengers.io',
		isLocked: true,
		data: {
			collapsableRowsMigrated: true,
			description: '',
			name: '',
			panelMap: {},
			tags: ['linux'],
			title: 'thor',
			uploadedGrafana: false,
			uuid: '',
			version: '',
			variables: {},
		},
	},
};
