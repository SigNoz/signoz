// Write a test for a component that renders a card with a title and a description

import { fireEvent, render, screen } from '@testing-library/react';
import ROUTES from 'constants/routes';
import { QueryClient, QueryClientProvider } from 'react-query';

import ExplorerCard from './index';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${process.env.FRONTEND_API_ENDPOINT}/${ROUTES.TRACES_EXPLORER}/`,
	}),
}));

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
		},
	},
});

jest.mock('hooks/queryBuilder/useGetPanelTypesQueryParam', () => ({
	useGetPanelTypesQueryParam: jest.fn(() => 'mockedPanelType'),
}));

const testData = [
	{
		uuid: 'view1',
		name: 'View 1',
		createdBy: 'User 1',
	},
	{
		uuid: 'view2',
		name: 'View 2',
		createdBy: 'User 2',
	},
];

jest.mock('hooks/saveViews/useGetAllViews', () => ({
	useGetAllViews: jest.fn(() => ({
		data: { data: { data: testData } },
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
			<QueryClientProvider client={queryClient}>
				<ExplorerCard sourcepage="traces">child</ExplorerCard>
			</QueryClientProvider>,
		);
		expect(screen.getByText('Query Builder')).toBeInTheDocument();
	});

	// test to check if save view button is present
	it('renders a save view button', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<ExplorerCard sourcepage="traces">child</ExplorerCard>
			</QueryClientProvider>,
		);
		expect(screen.getByText('Save View')).toBeInTheDocument();
	});

	it('should change viewName when a dropdown item is selected', async () => {
		const screen = render(
			<ExplorerCard sourcepage="traces">Mock Children</ExplorerCard>,
		);

		const selectButton = screen.getByText('Select');

		fireEvent.click(selectButton);

		const spanElement = screen.getByRole('img', {
			name: 'down',
		});
		fireEvent.click(spanElement);
		const viewNameText = await screen.findByText('View 2');

		expect(viewNameText).toBeInTheDocument();
	});
});
