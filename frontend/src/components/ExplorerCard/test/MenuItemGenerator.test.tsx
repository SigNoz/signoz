import { render, screen } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { QueryClient, QueryClientProvider } from 'react-query';

import { viewMockData } from '../__mock__/viewData';
import MenuItemGenerator from '../MenuItemGenerator';

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

describe('MenuItemGenerator', () => {
	it('should render MenuItemGenerator component', () => {
		const screen = render(
			<QueryClientProvider client={queryClient}>
				<MenuItemGenerator
					viewName={viewMockData[0].name}
					viewKey={viewMockData[0].uuid}
					createdBy={viewMockData[0].createdBy}
					uuid={viewMockData[0].uuid}
					refetchAllView={jest.fn()}
					viewData={viewMockData}
					currentPanelType={PANEL_TYPES.TRACE}
				/>
			</QueryClientProvider>,
		);

		expect(screen.getByText(viewMockData[0].name)).toBeInTheDocument();
	});

	it('should call onMenuItemSelectHandler on click of MenuItemGenerator', () => {
		render(
			<QueryClientProvider client={queryClient}>
				<MenuItemGenerator
					viewName={viewMockData[0].name}
					viewKey={viewMockData[0].uuid}
					createdBy={viewMockData[0].createdBy}
					uuid={viewMockData[0].uuid}
					refetchAllView={jest.fn()}
					viewData={viewMockData}
					currentPanelType={PANEL_TYPES.TRACE}
				/>
			</QueryClientProvider>,
		);

		const spanElement = screen.getByRole('img', {
			name: 'delete',
		});

		expect(spanElement).toBeInTheDocument();
	});
});
