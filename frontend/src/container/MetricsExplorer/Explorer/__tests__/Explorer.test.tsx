import { render } from '@testing-library/react';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import * as useOptionsMenuHooks from 'container/OptionsMenu';
import * as useUpdateDashboardHooks from 'hooks/dashboard/useUpdateDashboard';
import * as useQueryBuilderHooks from 'hooks/queryBuilder/useQueryBuilder';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from 'store';
import { DataSource } from 'types/common/queryBuilder';

import Explorer from '../Explorer';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${ROUTES.METRICS_EXPLORER_EXPLORER}`,
	}),
}));
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));
jest.mock('hooks/useNotifications', () => ({
	useNotifications: (): any => ({
		notifications: {
			error: jest.fn(),
		},
	}),
}));
jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};
	const uplotMock = jest.fn(() => ({
		paths,
	}));
	return {
		paths,
		default: uplotMock,
	};
});
jest.mock('react-redux', () => ({
	...jest.requireActual('react-redux'),
	useSelector: (): any => ({
		globalTime: {
			selectedTime: {
				startTime: 1713734400000,
				endTime: 1713738000000,
			},
			maxTime: 1713738000000,
			minTime: 1713734400000,
		},
	}),
}));

jest.spyOn(useUpdateDashboardHooks, 'useUpdateDashboard').mockReturnValue({
	mutate: jest.fn(),
	isLoading: false,
} as any);

jest.spyOn(useOptionsMenuHooks, 'useOptionsMenu').mockReturnValue({
	selectColumns: [],
} as any);

const mockUpdateAllQueriesOperators = jest.fn();
const mockUseQueryBuilderData = {
	handleRunQuery: jest.fn(),
	stagedQuery: initialQueriesMap[DataSource.METRICS],
	updateAllQueriesOperators: mockUpdateAllQueriesOperators,
	currentQuery: initialQueriesMap[DataSource.METRICS],
	resetQuery: jest.fn(),
	redirectWithQueryBuilderData: jest.fn(),
};
jest.spyOn(useQueryBuilderHooks, 'useQueryBuilder').mockReturnValue({
	mockUseQueryBuilderData,
} as any);

describe('Explorer', () => {
	it('should render Explorer query builder with metrics datasource selected', () => {
		jest.spyOn(useQueryBuilderHooks, 'useQueryBuilder').mockReturnValue({
			...mockUseQueryBuilderData,
			// Initially have a different datasource
			stagedQuery: initialQueriesMap[DataSource.TRACES],
		} as any);
		render(
			<MemoryRouter>
				<Provider store={store}>
					<Explorer />
				</Provider>
			</MemoryRouter>,
		);
		expect(mockUpdateAllQueriesOperators).toHaveBeenCalledWith(
			initialQueriesMap[DataSource.METRICS],
			PANEL_TYPES.TIME_SERIES,
			DataSource.METRICS,
		);
	});
});
