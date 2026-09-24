import { render, screen } from 'tests/test-utils';

import { QuickFiltersSource } from '../../types';
import QuickFiltersLayout from '../QuickFiltersLayout';

jest.mock('../QuickFiltersLayout.module.scss', () => ({
	__esModule: true,
	default: {
		layout: 'layout',
		filters: 'filters',
		content: 'content',
	},
}));

jest.mock('../../QuickFilters', () => ({
	__esModule: true,
	default: ({ source }: { source: string }): JSX.Element => (
		<div data-testid="quick-filters">{source}</div>
	),
}));

const quickFilterProps = {
	source: QuickFiltersSource.TRACES_EXPLORER,
	handleFilterVisibilityChange: jest.fn(),
};

describe('QuickFiltersLayout', () => {
	it('renders QuickFilters with the given props inside the filters pane', () => {
		render(
			<QuickFiltersLayout showFilters quickFilterProps={quickFilterProps}>
				<div>content</div>
			</QuickFiltersLayout>,
		);

		const filtersPane = screen.getByTestId('quick-filters-layout-filters');
		expect(filtersPane).toContainElement(screen.getByTestId('quick-filters'));
		expect(screen.getByTestId('quick-filters')).toHaveTextContent(
			QuickFiltersSource.TRACES_EXPLORER,
		);
		expect(screen.getByTestId('quick-filters-layout-content')).toHaveTextContent(
			'content',
		);
	});

	it('does not render the filters pane when showFilters is false', () => {
		render(
			<QuickFiltersLayout showFilters={false} quickFilterProps={quickFilterProps}>
				<div>content</div>
			</QuickFiltersLayout>,
		);

		expect(
			screen.queryByTestId('quick-filters-layout-filters'),
		).not.toBeInTheDocument();
		expect(screen.queryByTestId('quick-filters')).not.toBeInTheDocument();
		expect(screen.getByText('content')).toBeInTheDocument();
	});

	it('merges classNames onto the root and content panes', () => {
		render(
			<QuickFiltersLayout
				showFilters
				quickFilterProps={quickFilterProps}
				className="page-root"
				contentClassName="page-content"
				testId="page"
			>
				<div>content</div>
			</QuickFiltersLayout>,
		);

		const root = screen.getByTestId('page');
		expect(root).toHaveClass('layout', 'page-root');
		expect(screen.getByTestId('quick-filters-layout-content')).toHaveClass(
			'content',
			'page-content',
		);
	});
});
