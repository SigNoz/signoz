export const EVALUATION_WINDOW_TYPE = [
	{ label: 'Rolling', value: 'rolling' },
	{ label: 'Cumulative', value: 'cumulative' },
];

export const EVALUATION_WINDOW_TIMEFRAME = {
	rolling: [
		{ label: 'Last 5 minutes', value: '5m0s' },
		{ label: 'Last 10 minutes', value: '10m0s' },
		{ label: 'Last 15 minutes', value: '15m0s' },
		{ label: 'Last 30 minutes', value: '30m0s' },
		{ label: 'Last 1 hour', value: '1h0m0s' },
		{ label: 'Last 2 hours', value: '2h0m0s' },
		{ label: 'Last 4 hours', value: '4h0m0s' },
	],
	cumulative: [
		{ label: 'Current hour', value: 'currentHour' },
		{ label: 'Current day', value: 'currentDay' },
		{ label: 'Current month', value: 'currentMonth' },
	],
};
