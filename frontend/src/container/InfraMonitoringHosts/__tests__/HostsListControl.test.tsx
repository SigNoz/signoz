import { render, screen } from '@testing-library/react';

import HostsListControls from '../HostsListControls';

jest.mock('container/QueryBuilder/filters/QueryBuilderSearch', () => ({
	__esModule: true,
	default: (): JSX.Element => (
		<div data-testid="query-builder-search">Search</div>
	),
}));

jest.mock('container/TopNav/DateTimeSelectionV2', () => ({
	__esModule: true,
	default: (): JSX.Element => (
		<div data-testid="date-time-selection">Date Time</div>
	),
}));

describe('HostsListControls', () => {
	const mockHandleFiltersChange = jest.fn();
	const mockFilters = {
		items: [],
		op: 'AND',
	};

	it('renders search and date time filters', () => {
		render(
			<HostsListControls
				handleFiltersChange={mockHandleFiltersChange}
				filters={mockFilters}
				showAutoRefresh={false}
			/>,
		);

		expect(screen.getByTestId('query-builder-search')).toBeInTheDocument();
		expect(screen.getByTestId('date-time-selection')).toBeInTheDocument();
	});
});
