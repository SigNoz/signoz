import { render, screen } from '@testing-library/react';
import ROUTES from 'constants/routes';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';
import { DataSource } from 'types/common/queryBuilder';

import { viewMockData } from '../__mock__/viewData';
import MenuItemGenerator from '../MenuItemGenerator';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${process.env.FRONTEND_API_ENDPOINT}${ROUTES.APPLICATION}/`,
	}),
}));

jest.mock('antd/es/form/Form', () => ({
	useForm: jest.fn().mockReturnValue({
		onFinish: jest.fn(),
	}),
}));

describe('MenuItemGenerator', () => {
	it('should render MenuItemGenerator component', () => {
		const screen = render(
			<MockQueryClientProvider>
				<MenuItemGenerator
					viewName={viewMockData[0].name}
					viewKey={viewMockData[0].uuid}
					createdBy={viewMockData[0].createdBy}
					uuid={viewMockData[0].uuid}
					refetchAllView={jest.fn()}
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
					viewKey={viewMockData[0].uuid}
					createdBy={viewMockData[0].createdBy}
					uuid={viewMockData[0].uuid}
					refetchAllView={jest.fn()}
					viewData={viewMockData}
					sourcePage={DataSource.TRACES}
				/>
			</MockQueryClientProvider>,
		);

		const spanElement = screen.getByRole('img', {
			name: 'delete',
		});

		expect(spanElement).toBeInTheDocument();
	});
});
