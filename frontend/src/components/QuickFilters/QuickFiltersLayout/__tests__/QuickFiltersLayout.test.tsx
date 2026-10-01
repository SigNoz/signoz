import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { useSavedViewEnabled } from 'hooks/useSavedViewEnabled';
import { render, screen, userEvent } from 'tests/test-utils';

import { QuickFiltersSource } from '../../types';
import QuickFiltersLayout from '../QuickFiltersLayout';

jest.mock('../QuickFiltersLayout.module.scss', () => ({
	__esModule: true,
	default: {
		layout: 'layout',
		sidebar: 'sidebar',
		isStatic: 'isStatic',
		savedViews: 'savedViews',
		quickFilters: 'quickFilters',
		isOpen: 'isOpen',
		content: 'content',
		contentInner: 'contentInner',
	},
}));

jest.mock('hooks/useSavedViewEnabled', () => ({
	useSavedViewEnabled: jest.fn(() => true),
}));

jest.mock('../../QuickFilters', () => ({
	__esModule: true,
	default: ({
		source,
		savedViewsHeader,
		handleFilterVisibilityChange,
	}: {
		source: string;
		savedViewsHeader?: React.ReactNode;
		handleFilterVisibilityChange?: () => void;
	}): JSX.Element => (
		<div data-testid="quick-filters">
			{savedViewsHeader}
			{source}
			{handleFilterVisibilityChange && (
				<button
					type="button"
					aria-label="Collapse Filters"
					data-testid="quick-filters-collapse"
					onClick={handleFilterVisibilityChange}
				/>
			)}
		</div>
	),
}));

const quickFilterProps = {
	source: QuickFiltersSource.TRACES_EXPLORER,
};
const savedViewProps = { source: SavedviewtypesSourceDTO.traces };

const drawer = (): HTMLElement =>
	screen.getByTestId('quick-filters-layout-drawer');

describe('QuickFiltersLayout', () => {
	beforeEach(() => {
		jest.mocked(useSavedViewEnabled).mockReturnValue(true);
	});

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
		expect(screen.queryByTestId('saved-views-header')).not.toBeInTheDocument();
	});

	it('does not render the filters pane when showFilters is false', () => {
		render(
			<QuickFiltersLayout
				showFilters={false}
				quickFilterProps={quickFilterProps}
				savedViewProps={savedViewProps}
			>
				<div>content</div>
			</QuickFiltersLayout>,
		);

		expect(
			screen.queryByTestId('quick-filters-layout-filters'),
		).not.toBeInTheDocument();
		expect(screen.queryByTestId('quick-filters')).not.toBeInTheDocument();
		expect(screen.getByText('content')).toBeInTheDocument();
	});

	it('renders no sidebar at all without quick filters or saved views', () => {
		render(
			<QuickFiltersLayout showFilters>
				<div>content</div>
			</QuickFiltersLayout>,
		);

		expect(
			screen.queryByTestId('quick-filters-layout-filters'),
		).not.toBeInTheDocument();
		expect(screen.getByText('content')).toBeInTheDocument();
	});

	it('merges classNames onto the root and content panes', () => {
		render(
			<QuickFiltersLayout
				showFilters
				quickFilterProps={quickFilterProps}
				className="root-extra"
				contentClassName="content-extra"
				testId="layout"
			>
				<div>content</div>
			</QuickFiltersLayout>,
		);

		expect(screen.getByTestId('layout')).toHaveClass('layout', 'root-extra');
		expect(screen.getByTestId('quick-filters-layout-content')).toHaveClass(
			'content',
			'content-extra',
		);
	});

	describe('saved views', () => {
		it('ignores savedViewProps while the flag is off', () => {
			jest.mocked(useSavedViewEnabled).mockReturnValue(false);
			const { unmount } = render(
				<QuickFiltersLayout
					showFilters
					quickFilterProps={quickFilterProps}
					savedViewProps={savedViewProps}
				>
					<div>content</div>
				</QuickFiltersLayout>,
			);

			expect(screen.getByTestId('quick-filters')).toBeInTheDocument();
			expect(screen.queryByTestId('saved-views-header')).not.toBeInTheDocument();
			expect(screen.queryByTestId('saved-views-panel')).not.toBeInTheDocument();

			// Saved views only, so nothing is left to show.
			unmount();
			render(
				<QuickFiltersLayout showFilters savedViewProps={savedViewProps}>
					<div>content</div>
				</QuickFiltersLayout>,
			);
			expect(
				screen.queryByTestId('quick-filters-layout-filters'),
			).not.toBeInTheDocument();
		});

		it('opens the panel from the header and slides the quick filters drawer, keeping the same QuickFilters node', async () => {
			render(
				<QuickFiltersLayout
					showFilters
					quickFilterProps={quickFilterProps}
					savedViewProps={savedViewProps}
				>
					<div>content</div>
				</QuickFiltersLayout>,
			);
			const user = userEvent.setup();
			const quickFilters = screen.getByTestId('quick-filters');

			expect(quickFilters).toContainElement(
				screen.getByTestId('saved-views-header'),
			);
			expect(drawer()).toContainElement(quickFilters);
			expect(screen.queryByTestId('saved-views-panel')).not.toBeInTheDocument();
			expect(drawer()).not.toHaveClass('isOpen');

			await user.click(screen.getByTestId('saved-views-open'));

			expect(screen.getByTestId('saved-views-panel')).toBeInTheDocument();
			expect(drawer()).toHaveClass('isOpen');
			expect(screen.getByTestId('quick-filters')).toBe(quickFilters);
			expect(screen.queryByTestId('saved-views-open')).not.toBeInTheDocument();

			await user.click(screen.getByTestId('saved-views-close'));

			expect(screen.queryByTestId('saved-views-panel')).not.toBeInTheDocument();
			expect(drawer()).not.toHaveClass('isOpen');
			expect(screen.getByTestId('quick-filters')).toBe(quickFilters);
			expect(screen.getByTestId('saved-views-open')).toBeInTheDocument();
		});

		it('hands the source to the header and the panel', async () => {
			render(
				<QuickFiltersLayout
					showFilters
					quickFilterProps={quickFilterProps}
					savedViewProps={savedViewProps}
				>
					<div>content</div>
				</QuickFiltersLayout>,
			);

			expect(screen.getByTestId('saved-views-header')).toHaveAttribute(
				'data-source',
				SavedviewtypesSourceDTO.traces,
			);
			await userEvent.setup().click(screen.getByTestId('saved-views-open'));
			expect(screen.getByTestId('saved-views-panel')).toHaveAttribute(
				'data-source',
				SavedviewtypesSourceDTO.traces,
			);
		});

		it('without quick filters: static sidebar, header on top, list always on screen with no open or close controls', () => {
			render(
				<QuickFiltersLayout showFilters savedViewProps={savedViewProps}>
					<div>content</div>
				</QuickFiltersLayout>,
			);

			const sidebar = screen.getByTestId('quick-filters-layout-filters');
			expect(sidebar).toHaveClass('isStatic');
			expect(screen.queryByTestId('quick-filters')).not.toBeInTheDocument();
			expect(screen.getByTestId('saved-views-header')).toBeInTheDocument();
			expect(screen.getByTestId('saved-views-panel')).toBeInTheDocument();
			expect(screen.queryByTestId('saved-views-open')).not.toBeInTheDocument();
			expect(screen.queryByTestId('saved-views-close')).not.toBeInTheDocument();
			expect(drawer()).not.toHaveClass('isOpen');
		});

		it('collapses from the quick filters header when they are shown', async () => {
			const onToggleFilters = jest.fn();
			render(
				<QuickFiltersLayout
					showFilters
					onToggleFilters={onToggleFilters}
					quickFilterProps={quickFilterProps}
					savedViewProps={savedViewProps}
				>
					<div>content</div>
				</QuickFiltersLayout>,
			);

			expect(screen.queryByTestId('saved-views-collapse')).not.toBeInTheDocument();
			await userEvent.click(screen.getByTestId('quick-filters-collapse'));
			expect(onToggleFilters).toHaveBeenCalledTimes(1);
		});

		it('collapses from the saved views header without quick filters', async () => {
			const onToggleFilters = jest.fn();
			render(
				<QuickFiltersLayout
					showFilters
					onToggleFilters={onToggleFilters}
					savedViewProps={savedViewProps}
				>
					<div>content</div>
				</QuickFiltersLayout>,
			);

			await userEvent.click(screen.getByTestId('saved-views-collapse'));
			expect(onToggleFilters).toHaveBeenCalledTimes(1);
		});

		it('has no collapse without a toggle', () => {
			render(
				<QuickFiltersLayout showFilters savedViewProps={savedViewProps}>
					<div>content</div>
				</QuickFiltersLayout>,
			);

			expect(screen.queryByTestId('saved-views-collapse')).not.toBeInTheDocument();
		});
	});
});
