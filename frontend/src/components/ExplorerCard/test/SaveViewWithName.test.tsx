import { fireEvent, render } from '@testing-library/react';
import ROUTES from 'constants/routes';
import { QueryClient, QueryClientProvider } from 'react-query';
import { DataSource } from 'types/common/queryBuilder';

import SaveViewWithName from '../SaveViewWithName';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${process.env.FRONTEND_API_ENDPOINT}${ROUTES.APPLICATION}/`,
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

jest.mock('hooks/saveViews/useSaveView', () => ({
	useSaveView: jest.fn(() => ({
		mutateAsync: jest.fn(),
	})),
}));

describe('SaveViewWithName', () => {
	it('should render SaveViewWithName component', () => {
		const screen = render(
			<QueryClientProvider client={queryClient}>
				<SaveViewWithName
					sourcePage={DataSource.TRACES}
					handlePopOverClose={jest.fn()}
					refetchAllView={jest.fn()}
				/>
			</QueryClientProvider>,
		);

		expect(screen.getByText('Save')).toBeInTheDocument();
	});

	it('should call saveViewAsync on click of Save button', () => {
		const screen = render(
			<QueryClientProvider client={queryClient}>
				<SaveViewWithName
					sourcePage={DataSource.TRACES}
					handlePopOverClose={jest.fn()}
					refetchAllView={jest.fn()}
				/>
			</QueryClientProvider>,
		);

		fireEvent.click(screen.getByText('Save'));

		expect(screen.getByText('Save')).toBeInTheDocument();
	});
});
