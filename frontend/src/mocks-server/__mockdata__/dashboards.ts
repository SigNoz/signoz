/* eslint-disable sonarjs/no-duplicate-string */
export const dashboardSuccessResponse = {
	status: 'success',
	data: [
		{
			id: '1',
			createdAt: '2022-11-16T13:29:47.064874419Z',
			createdBy: null,
			updatedAt: '2024-05-21T06:41:30.546630961Z',
			updatedBy: 'thor@avengers.io',
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
			id: '2',
			createdAt: '2022-11-16T13:20:47.064874419Z',
			createdBy: null,
			updatedAt: '2024-05-21T06:42:30.546630961Z',
			updatedBy: 'captain-america@avengers.io',
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
		id: '1',
		createdAt: '2022-11-16T13:29:47.064874419Z',
		createdBy: 'integration',
		updatedAt: '2024-05-21T06:41:30.546630961Z',
		updatedBy: 'thor@avengers.io',
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
		id: '1',
		createdAt: '2022-11-16T13:29:47.064874419Z',
		createdBy: 'thor',
		updatedAt: '2024-05-21T06:41:30.546630961Z',
		updatedBy: 'thor@avengers.io',
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
