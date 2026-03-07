import { QueryClient } from 'react-query';
import configureStore from 'redux-mock-store';

import { TopOperationList } from '../TopOperationsTable';

interface TopOperation {
	numCalls: number;
	errorCount: number;
}

export const getTopOperationList = ({
	errorCount,
	numCalls,
}: TopOperation): TopOperationList =>
	({
		p50: 0,
		errorCount,
		name: 'test',
		numCalls,
		p95: 0,
		p99: 0,
	} as TopOperationList);

export const defaultApiCallExpectation = {
	service: 'test-service',
	start: 1640995200000,
	end: 1641081600000,
	selectedTags: [],
	isEntryPoint: false,
};

export const mockStore = configureStore([]);
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
			refetchOnWindowFocus: false,
		},
	},
});

export const mockTopOperationsData: TopOperationList[] = [
	{
		name: 'GET /api/users',
		p50: 1000000,
		p95: 2000000,
		p99: 3000000,
		numCalls: 100,
		errorCount: 5,
	},
	{
		name: 'POST /api/orders',
		p50: 1500000,
		p95: 2500000,
		p99: 3500000,
		numCalls: 80,
		errorCount: 2,
	},
];

export const mockEntryPointData: TopOperationList[] = [
	{
		name: 'GET /api/health',
		p50: 500000,
		p95: 1000000,
		p99: 1500000,
		numCalls: 200,
		errorCount: 0,
	},
];

export const createMockStore = (): any =>
	mockStore({
		globalTime: {
			minTime: 1640995200000,
			maxTime: 1641081600000,
		},
	});
