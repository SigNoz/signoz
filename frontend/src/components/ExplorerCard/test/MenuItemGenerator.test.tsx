import { render, screen } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';

import { viewMockData } from '../__mock__/viewData';
import MenuItemGenerator from '../MenuItemGenerator';

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
					currentPanelType={PANEL_TYPES.TRACE}
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
					currentPanelType={PANEL_TYPES.TRACE}
				/>
			</MockQueryClientProvider>,
		);

		const spanElement = screen.getByRole('img', {
			name: 'delete',
		});

		expect(spanElement).toBeInTheDocument();
	});
});
