import { fireEvent, render, screen } from '@testing-library/react';
import ROUTES from 'constants/routes';
import { QueryClient, QueryClientProvider } from 'react-query';

import { viewMockData } from '../__mock__/viewData';
import ExplorerCard from '../ExplorerCard';

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
			<QueryClientProvider client={queryClient}>
				<ExplorerCard sourcepage="traces">child</ExplorerCard>
			</QueryClientProvider>,
		);
		expect(screen.getByText('Query Builder')).toBeInTheDocument();
	});

	it('renders a save view button', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<ExplorerCard sourcepage="traces">child</ExplorerCard>
			</QueryClientProvider>,
		);
		expect(screen.getByText('Save View')).toBeInTheDocument();
	});

	it('should see all the view listed in dropdown', async () => {
		const screen = render(
			<ExplorerCard sourcepage="traces">Mock Children</ExplorerCard>,
		);
		const selectButton = screen.getByText('Select View');

		fireEvent.click(selectButton);

		const spanElement = screen.getByRole('img', {
			name: 'down',
		});
		fireEvent.click(spanElement);
		const viewNameText = await screen.findByText('View 2');
		expect(viewNameText).toBeInTheDocument();
	});
});
