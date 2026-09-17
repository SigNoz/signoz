// `tests/test-utils` needs the redux store only for `getState()`, to seed
// `redux-mock-store`, which never runs a reducer. Importing the real store pulls
// its whole reducer graph into every test file, so this snapshot of the initial
// state stands in for it.
//
// Regenerate by printing `JSON.stringify(store.getState())` from a test.
const INITIAL_STATE = {
	traces: {
		filter: {},
		filterToFetchData: ['duration', 'status', 'serviceName'],
		filterLoading: true,
		filterResponseSelected: {},
		selectedFilter: {},
		selectedTags: [],
		isTagModalOpen: false,
		isTagModalError: false,
		isFilterExclude: {},
		userSelectedFilter: {},
		spansAggregate: {
			currentPage: 1,
			loading: false,
			data: [],
			error: false,
			total: 0,
			pageSize: 10,
			order: '',
			orderParam: '',
		},
		selectedGroupBy: '',
		selectedFunction: 'count',
		yAxisUnit: '',
		spansGraph: {
			error: false,
			errorMessage: '',
			loading: true,
			payload: {
				items: {},
			},
		},
		filterDisplayValue: {},
	},
	usageDate: [
		{
			timestamp: 0,
			count: 0,
		},
	],
	globalTime: {
		maxTime: 1789616738446000000,
		minTime: 1789615838446000000,
		loading: true,
		selectedTime: '30m',
		isAutoRefreshDisabled: false,
		selectedAutoRefreshInterval: '',
	},
	serviceMap: {
		items: [],
		loading: true,
	},
	app: {
		currentVersion: '',
		latestVersion: '',
		isCurrentVersionError: false,
		isLatestVersionError: false,
		configs: {},
		ee: 'Y',
		setupCompleted: true,
	},
	metrics: {
		error: false,
		errorMessage: '',
		loading: true,
		metricsApplicationLoading: true,
		services: [],
		dbOverView: [],
		externalService: [],
		topOperations: [],
		externalAverageDuration: [],
		externalError: [],
		serviceOverview: [],
		topLevelOperations: [],
	},
	logs: {
		fields: {
			interesting: [],
			selected: [],
		},
		searchFilter: {
			queryString: '',
			parsedQuery: [],
		},
		logs: [],
		logLinesPerPage: 200,
		linesPerRow: 2,
		viewMode: 'raw',
		idEnd: '',
		idStart: '',
		isLoading: false,
		isLoadingAggregate: false,
		logsAggregate: [],
		liveTail: 'STOPPED',
		liveTailStartRange: 15,
		selectedLogId: null,
		detailedLog: null,
		order: 'desc',
	},
};

export default {
	getState: (): typeof INITIAL_STATE => INITIAL_STATE,
	dispatch: (): void => {},
	subscribe: (): (() => void) => (): void => {},
	replaceReducer: (): void => {},
};
