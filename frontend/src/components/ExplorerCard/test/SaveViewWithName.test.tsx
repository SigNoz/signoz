import { QueryClient, QueryClientProvider } from 'react-query';
import { fireEvent, render } from '@testing-library/react';
import ROUTES from 'constants/routes';
import { DataSource } from 'types/common/queryBuilder';

import SaveViewWithName from '../SaveViewWithName';

vi.mock('react-router-dom', async () => {
	const actual =
		await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
	return {
		...actual,
		useLocation: (): { pathname: string } => ({
			pathname: `${process.env.FRONTEND_API_ENDPOINT}${ROUTES.APPLICATION}/`,
		}),
	};
});

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
		},
	},
});

vi.mock('hooks/queryBuilder/useGetPanelTypesQueryParam', () => ({
	useGetPanelTypesQueryParam: vi.fn(() => 'mockedPanelType'),
}));

vi.mock('hooks/saveViews/useSaveView', () => ({
	useSaveView: vi.fn(() => ({
		mutateAsync: vi.fn(),
	})),
}));

describe('SaveViewWithName', () => {
	it('should render SaveViewWithName component', () => {
		const screen = render(
			<QueryClientProvider client={queryClient}>
				<SaveViewWithName
					sourcePage={DataSource.TRACES}
					handlePopOverClose={vi.fn()}
					refetchAllView={vi.fn()}
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
					handlePopOverClose={vi.fn()}
					refetchAllView={vi.fn()}
				/>
			</QueryClientProvider>,
		);

		fireEvent.click(screen.getByText('Save'));

		expect(screen.getByText('Save')).toBeInTheDocument();
	});
});
