import { render, screen } from '@testing-library/react';
import ROUTES from 'constants/routes';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';
import { DataSource } from 'types/common/queryBuilder';

import { viewMockData } from '../__mock__/viewData';
import ExplorerCard from '../ExplorerCard';

const historyReplace = jest.fn();

// eslint-disable-next-line sonarjs/no-duplicate-string
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${process.env.FRONTEND_API_ENDPOINT}/${ROUTES.TRACES_EXPLORER}/`,
	}),
	useHistory: (): any => ({
		...jest.requireActual('react-router-dom').useHistory(),
		replace: historyReplace,
	}),
}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

jest.mock('hooks/queryBuilder/useGetPanelTypesQueryParam', () => ({
	useGetPanelTypesQueryParam: jest.fn(() => 'mockedPanelType'),
}));

jest.mock('hooks/saveViews/useGetAllViews', () => ({
	useGetAllViews: jest.fn(() => ({
		data: { data: { data: viewMockData } },
		isLoading: false,
		error: null,
		isRefetching: false,
		refetch: jest.fn(),
	})),
}));

jest.mock('hooks/saveViews/useUpdateView', () => ({
	useUpdateView: jest.fn(() => ({
		mutateAsync: jest.fn(),
	})),
}));

jest.mock('hooks/saveViews/useDeleteView', () => ({
	useDeleteView: jest.fn(() => ({
		mutateAsync: jest.fn(),
	})),
}));

describe('ExplorerCard', () => {
	it('renders a card with a title and a description', () => {
		render(
			<MockQueryClientProvider>
				<ExplorerCard sourcepage={DataSource.TRACES}>child</ExplorerCard>
			</MockQueryClientProvider>,
		);
		expect(screen.queryByText('Query Builder')).not.toBeInTheDocument();
	});

	it('renders a save view button', () => {
		render(
			<MockQueryClientProvider>
				<ExplorerCard sourcepage={DataSource.TRACES}>child</ExplorerCard>
			</MockQueryClientProvider>,
		);
		expect(screen.queryByText('Save view')).not.toBeInTheDocument();
	});
});
