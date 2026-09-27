import { fireEvent, render, screen } from '@testing-library/react';

import { useDashboardSections } from '../../../../hooks/useDashboardSections';
import { usePanelPickerTargetStore } from '../../../../store/usePanelPickerTargetStore';
import PanelTypeSelectionModal from '../PanelTypeSelectionModal';

// Stub the registry so the test doesn't pull in the real renderers and chart libs.
jest.mock('../../../../Panels/registry', () => {
	const options = [
		{ kind: 'signoz/TimeSeriesPanel', displayName: 'Time Series' },
		{ kind: 'signoz/NumberPanel', displayName: 'Number' },
		{ kind: 'signoz/TablePanel', displayName: 'Table' },
		{ kind: 'signoz/BarChartPanel', displayName: 'Bar Chart' },
		{ kind: 'signoz/AreaChartPanel', displayName: 'Area' },
		{ kind: 'signoz/PieChartPanel', displayName: 'Pie Chart' },
		{ kind: 'signoz/HistogramPanel', displayName: 'Histogram' },
		{ kind: 'signoz/ListPanel', displayName: 'List' },
		{ kind: 'signoz/TextPanel', displayName: 'Text' },
	].map((option) => ({ ...option, icon: (): null => null }));
	return {
		PANEL_OPTIONS: options,
		getPanelDefinition: (kind: string): unknown =>
			options.find((option) => option.kind === kind),
	};
});

jest.mock('../../../../hooks/useDashboardSections', () => ({
	useDashboardSections: jest.fn(),
}));

const mockUseDashboardSections = useDashboardSections as jest.Mock;

const ROOT_ONLY = [{ layoutIndex: 0, title: undefined, panelIds: [] }];
const WITH_SECTIONS = [
	{ layoutIndex: 0, title: 'Overview', panelIds: [] },
	{ layoutIndex: 1, title: 'Latency', panelIds: [] },
];

function renderDrawer(
	props: Partial<Parameters<typeof PanelTypeSelectionModal>[0]> = {},
): { onSelect: jest.Mock; onClose: jest.Mock } {
	const onSelect = jest.fn();
	const onClose = jest.fn();
	render(
		<PanelTypeSelectionModal
			open
			onClose={onClose}
			onSelect={onSelect}
			{...props}
		/>,
	);
	return { onSelect, onClose };
}

describe('PanelTypeSelectionModal', () => {
	beforeEach(() => {
		mockUseDashboardSections.mockReturnValue(ROOT_ONLY);
		usePanelPickerTargetStore.getState().reset();
	});

	it('adds the default Time Series panel when confirmed untouched', () => {
		const { onSelect } = renderDrawer();

		fireEvent.click(screen.getByTestId('panel-type-confirm'));

		expect(onSelect).toHaveBeenCalledWith('signoz/TimeSeriesPanel', {
			type: 'section',
			layoutIndex: 0,
		});
	});

	it('selects a tile, then adds it on confirm', () => {
		const { onSelect } = renderDrawer();

		fireEvent.click(screen.getByTestId('panel-type-signoz/TablePanel'));
		expect(onSelect).not.toHaveBeenCalled();
		expect(screen.getByTestId('panel-type-signoz/TablePanel')).toHaveAttribute(
			'aria-pressed',
			'true',
		);

		fireEvent.click(screen.getByTestId('panel-type-confirm'));
		expect(onSelect).toHaveBeenCalledWith('signoz/TablePanel', {
			type: 'section',
			layoutIndex: 0,
		});
	});

	it('hides the section picker when the dashboard has a single layout', () => {
		renderDrawer();

		expect(screen.queryByTestId('panel-section-select')).not.toBeInTheDocument();
	});

	it('targets the section it was opened against', () => {
		mockUseDashboardSections.mockReturnValue(WITH_SECTIONS);
		const { onSelect } = renderDrawer({ defaultLayoutIndex: 1 });

		expect(screen.getByTestId('panel-section-select')).toBeInTheDocument();
		fireEvent.click(screen.getByTestId('panel-type-confirm'));

		expect(onSelect).toHaveBeenCalledWith('signoz/TimeSeriesPanel', {
			type: 'section',
			layoutIndex: 1,
		});
	});

	it('defaults to the root on a sectioned dashboard, even one without a root', () => {
		mockUseDashboardSections.mockReturnValue(WITH_SECTIONS);
		const { onSelect } = renderDrawer();

		fireEvent.click(screen.getByTestId('panel-type-confirm'));

		expect(onSelect).toHaveBeenCalledWith('signoz/TimeSeriesPanel', {
			type: 'root',
		});
	});

	it('filters tiles by search and offers to clear an empty result', () => {
		renderDrawer();
		const search = screen.getByTestId('panel-type-search');

		fireEvent.change(search, { target: { value: 'markdown' } });
		expect(screen.getByTestId('panel-type-signoz/TextPanel')).toBeInTheDocument();
		expect(
			screen.queryByTestId('panel-type-signoz/TablePanel'),
		).not.toBeInTheDocument();

		fireEvent.change(search, { target: { value: 'zzz' } });
		expect(screen.getByText('No panel types match “zzz”')).toBeInTheDocument();

		fireEvent.click(screen.getByText('Clear search'));
		expect(
			screen.getByTestId('panel-type-signoz/TablePanel'),
		).toBeInTheDocument();
	});

	it('narrows tiles to the chosen category', () => {
		renderDrawer();

		fireEvent.click(screen.getByRole('button', { name: /Raw records/ }));

		expect(screen.getByTestId('panel-type-signoz/ListPanel')).toBeInTheDocument();
		expect(
			screen.queryByTestId('panel-type-signoz/TimeSeriesPanel'),
		).not.toBeInTheDocument();
	});

	it('closes on Cancel', () => {
		const { onClose, onSelect } = renderDrawer();

		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

		expect(onClose).toHaveBeenCalled();
		expect(onSelect).not.toHaveBeenCalled();
	});

	describe('new section', () => {
		it('asks for the named section, created when the panel is saved', () => {
			const { onSelect } = renderDrawer();

			fireEvent.click(screen.getByTestId('panel-section-create'));
			const confirm = screen.getByTestId('panel-type-confirm');
			expect(confirm).toBeDisabled();

			fireEvent.change(screen.getByTestId('panel-section-name'), {
				target: { value: '  Errors ' },
			});
			fireEvent.click(confirm);

			expect(onSelect).toHaveBeenCalledWith('signoz/TimeSeriesPanel', {
				type: 'newSection',
				title: 'Errors',
			});
		});

		it('returns to the section picker when the draft is cancelled', () => {
			mockUseDashboardSections.mockReturnValue(WITH_SECTIONS);
			renderDrawer();

			fireEvent.mouseDown(screen.getByRole('combobox'));
			fireEvent.click(screen.getByTestId('panel-section-create'));
			expect(screen.getByTestId('panel-section-name')).toBeInTheDocument();

			fireEvent.keyDown(screen.getByTestId('panel-section-name'), {
				key: 'Escape',
			});
			expect(screen.queryByTestId('panel-section-name')).not.toBeInTheDocument();
			expect(screen.getByTestId('panel-section-select')).toBeInTheDocument();
		});
	});

	describe('section highlight', () => {
		const target = (): number | null =>
			usePanelPickerTargetStore.getState().targetLayoutIndex;

		it('does not publish a target without a section picker', () => {
			renderDrawer();

			expect(target()).toBeNull();
		});

		it('publishes the chosen section while open', () => {
			mockUseDashboardSections.mockReturnValue(WITH_SECTIONS);
			renderDrawer({ defaultLayoutIndex: 1 });

			expect(target()).toBe(1);
		});

		it('restores the pre-reveal scroll position on cancel', () => {
			mockUseDashboardSections.mockReturnValue(WITH_SECTIONS);
			renderDrawer({ defaultLayoutIndex: 1 });
			const scrollTo = jest.fn();
			// jsdom elements have no scrollTo.
			const scroller = { scrollTo } as unknown as HTMLElement;
			usePanelPickerTargetStore
				.getState()
				.rememberScrollOrigin({ element: scroller, top: 120 });

			fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

			expect(scrollTo).toHaveBeenCalledWith({
				top: 120,
				behavior: 'smooth',
			});
			expect(target()).toBeNull();
		});

		it('keeps the scroll position when a panel is added', () => {
			mockUseDashboardSections.mockReturnValue(WITH_SECTIONS);
			renderDrawer({ defaultLayoutIndex: 1 });
			const scrollTo = jest.fn();
			// jsdom elements have no scrollTo.
			const scroller = { scrollTo } as unknown as HTMLElement;
			usePanelPickerTargetStore
				.getState()
				.rememberScrollOrigin({ element: scroller, top: 120 });

			fireEvent.click(screen.getByTestId('panel-type-confirm'));

			expect(scrollTo).not.toHaveBeenCalled();
			expect(usePanelPickerTargetStore.getState().scrollOrigin).toBeNull();
		});
	});
});
