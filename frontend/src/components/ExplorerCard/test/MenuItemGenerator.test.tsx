import { render, screen } from '@testing-library/react';
import ROUTES from 'constants/routes';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';
import { DataSource } from 'types/common/queryBuilder';

import { viewMockData } from '../__mock__/viewData';
import MenuItemGenerator from '../MenuItemGenerator';

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

vi.mock('antd', async () => {
	const actual = await vi.importActual<typeof import('antd')>('antd');
	return {
		...actual,
		useForm: vi.fn().mockReturnValue({
			onFinish: vi.fn(),
		}),
	};
});

describe('MenuItemGenerator', () => {
	it('should render MenuItemGenerator component', () => {
		const screen = render(
			<MockQueryClientProvider>
				<MenuItemGenerator
					viewName={viewMockData[0].name}
					viewKey={viewMockData[0].id}
					createdBy={viewMockData[0].createdBy}
					uuid={viewMockData[0].id}
					refetchAllView={vi.fn()}
					viewData={viewMockData}
					sourcePage={DataSource.TRACES}
				/>
			</MockQueryClientProvider>,
		);

		expect(screen.getByText(viewMockData[0].name)).toBeInTheDocument();
	});

	it('should call onMenuItemSelectHandler on click of MenuItemGenerator', () => {
		render(
			<MockQueryClientProvider>
				<MenuItemGenerator
					viewName={viewMockData[0].name}
					viewKey={viewMockData[0].id}
					createdBy={viewMockData[0].createdBy}
					uuid={viewMockData[0].id}
					refetchAllView={vi.fn()}
					viewData={viewMockData}
					sourcePage={DataSource.TRACES}
				/>
			</MockQueryClientProvider>,
		);

		const spanElement = screen.getByRole('img', {
			name: /delete view/i,
		});

		expect(spanElement).toBeInTheDocument();
	});
});
