import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@signozhq/ui/tooltip';

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

type User = ReturnType<typeof userEvent.setup>;

function renderDrawer(
	props: Partial<Parameters<typeof PanelTypeSelectionModal>[0]> = {},
): {
	onSelect: jest.Mock;
	onClose: jest.Mock;
	user: User;
} {
	// The open drawer sets `pointer-events: none` on the body.
	const user = userEvent.setup({ pointerEventsCheck: 0 });
	const onSelect = jest.fn();
	const onClose = jest.fn();
	render(
		<TooltipProvider>
			<PanelTypeSelectionModal
				open
				onClose={onClose}
				onSelect={onSelect}
				{...props}
			/>
		</TooltipProvider>,
	);
	return { onSelect, onClose, user };
}

async function openSectionMenu(user: User): Promise<void> {
	await user.click(screen.getByRole('button', { name: 'Choose section' }));
}

async function startNewSection(user: User): Promise<void> {
	await openSectionMenu(user);
	await user.click(screen.getByTestId('panel-section-create'));
	await screen.findByTestId('panel-section-name');
}

describe('PanelTypeSelectionModal', () => {
	beforeEach(() => {
		mockUseDashboardSections.mockReturnValue(ROOT_ONLY);
		usePanelPickerTargetStore.getState().reset();
	});

	it('adds the default Time Series panel when confirmed untouched', async () => {
		const { onSelect, user } = renderDrawer();

		await user.click(screen.getByTestId('panel-type-confirm'));

		expect(onSelect).toHaveBeenCalledWith('signoz/TimeSeriesPanel', {
			type: 'section',
			layoutIndex: 0,
		});
	});

	it('selects a tile, then adds it on confirm', async () => {
		const { onSelect, user } = renderDrawer();

		await user.click(screen.getByTestId('panel-type-signoz/TablePanel'));
		expect(onSelect).not.toHaveBeenCalled();
		expect(screen.getByTestId('panel-type-signoz/TablePanel')).toHaveAttribute(
			'aria-pressed',
			'true',
		);

		await user.click(screen.getByTestId('panel-type-confirm'));
		expect(onSelect).toHaveBeenCalledWith('signoz/TablePanel', {
			type: 'section',
			layoutIndex: 0,
		});
	});

	it('names no section in the CTA when the dashboard has a single layout', () => {
		renderDrawer();

		expect(screen.getByTestId('panel-type-confirm')).toHaveTextContent(
			'Add panel',
		);
	});

	it('targets the section it was opened against', async () => {
		mockUseDashboardSections.mockReturnValue(WITH_SECTIONS);
		const { onSelect, user } = renderDrawer({ defaultLayoutIndex: 1 });

		const confirm = screen.getByTestId('panel-type-confirm');
		expect(confirm).toHaveTextContent('Add to Latency');
		await user.click(confirm);

		expect(onSelect).toHaveBeenCalledWith('signoz/TimeSeriesPanel', {
			type: 'section',
			layoutIndex: 1,
		});
	});

	it('switches the target section from the menu', async () => {
		mockUseDashboardSections.mockReturnValue(WITH_SECTIONS);
		const { onSelect, user } = renderDrawer({ defaultLayoutIndex: 1 });

		await openSectionMenu(user);
		await user.click(screen.getByTestId('panel-section-option-0'));
		const confirm = screen.getByTestId('panel-type-confirm');
		expect(confirm).toHaveTextContent('Add to Overview');
		await user.click(confirm);

		expect(onSelect).toHaveBeenCalledWith('signoz/TimeSeriesPanel', {
			type: 'section',
			layoutIndex: 0,
		});
	});

	it('defaults to the root on a sectioned dashboard, even one without a root', async () => {
		mockUseDashboardSections.mockReturnValue(WITH_SECTIONS);
		const { onSelect, user } = renderDrawer();

		await user.click(screen.getByTestId('panel-type-confirm'));

		expect(onSelect).toHaveBeenCalledWith('signoz/TimeSeriesPanel', {
			type: 'root',
		});
	});

	it('filters tiles by search and offers to clear an empty result', async () => {
		const { user } = renderDrawer();
		const search = screen.getByTestId('panel-type-search');

		await user.clear(search);
		await user.type(search, 'markdown');
		expect(screen.getByTestId('panel-type-signoz/TextPanel')).toBeInTheDocument();
		expect(
			screen.queryByTestId('panel-type-signoz/TablePanel'),
		).not.toBeInTheDocument();

		await user.clear(search);
		await user.type(search, 'zzz');
		expect(screen.getByText('No panel types match “zzz”')).toBeInTheDocument();

		await user.click(screen.getByText('Clear search'));
		expect(
			screen.getByTestId('panel-type-signoz/TablePanel'),
		).toBeInTheDocument();
	});

	it('narrows tiles to the chosen category', async () => {
		const { user } = renderDrawer();

		await user.click(screen.getByRole('button', { name: /Raw records/ }));

		expect(screen.getByTestId('panel-type-signoz/ListPanel')).toBeInTheDocument();
		expect(
			screen.queryByTestId('panel-type-signoz/TimeSeriesPanel'),
		).not.toBeInTheDocument();
	});

	it('closes on Cancel', async () => {
		const { onClose, onSelect, user } = renderDrawer();

		await user.click(screen.getByRole('button', { name: 'Cancel' }));

		expect(onClose).toHaveBeenCalled();
		expect(onSelect).not.toHaveBeenCalled();
	});

	describe('new section', () => {
		it('asks for the named section, created when the panel is saved', async () => {
			const { onSelect, user } = renderDrawer();

			await startNewSection(user);
			const confirm = screen.getByTestId('panel-type-confirm');
			expect(confirm).toBeDisabled();
			expect(confirm).toHaveTextContent('Add to new section');

			await user.type(screen.getByTestId('panel-section-name'), '  Errors ');
			await user.click(confirm);

			expect(onSelect).toHaveBeenCalledWith('signoz/TimeSeriesPanel', {
				type: 'newSection',
				title: 'Errors',
			});
		});

		it('publishes the draft for the dashboard preview', async () => {
			const draft = (): unknown =>
				usePanelPickerTargetStore.getState().draftSection;
			const { user } = renderDrawer();

			await startNewSection(user);
			await waitFor(() =>
				expect(draft()).toStrictEqual({
					title: '',
					panelKind: 'signoz/TimeSeriesPanel',
				}),
			);

			await user.type(screen.getByTestId('panel-section-name'), 'Errors');
			await user.click(screen.getByTestId('panel-type-signoz/TablePanel'));
			expect(draft()).toStrictEqual({
				title: 'Errors',
				panelKind: 'signoz/TablePanel',
			});

			await user.click(screen.getByTestId('panel-section-name-cancel'));
			expect(draft()).toBeNull();
		});

		it('returns to the section picker when the draft is cancelled', async () => {
			mockUseDashboardSections.mockReturnValue(WITH_SECTIONS);
			const { user } = renderDrawer();

			await startNewSection(user);
			expect(screen.getByTestId('panel-section-name')).toBeInTheDocument();

			await user.keyboard('{Escape}');
			expect(screen.queryByTestId('panel-section-name')).not.toBeInTheDocument();
			expect(screen.getByTestId('panel-type-confirm')).toHaveTextContent(
				'Add to Dashboard (root)',
			);
		});
	});

	describe('section highlight', () => {
		const target = (): unknown => usePanelPickerTargetStore.getState().target;

		it('targets the only section without outlining it', () => {
			renderDrawer();

			expect(target()).toStrictEqual({
				layoutIndex: 0,
				panelKind: 'signoz/TimeSeriesPanel',
				outline: false,
			});
		});

		it('publishes the chosen section and kind while open', async () => {
			mockUseDashboardSections.mockReturnValue(WITH_SECTIONS);
			const { user } = renderDrawer({ defaultLayoutIndex: 1 });

			await user.click(screen.getByTestId('panel-type-signoz/TablePanel'));

			expect(target()).toStrictEqual({
				layoutIndex: 1,
				panelKind: 'signoz/TablePanel',
				outline: true,
			});
		});

		it('drops the target while a new section is being named', async () => {
			const { user } = renderDrawer();

			await startNewSection(user);

			await waitFor(() => expect(target()).toBeNull());
		});

		it('restores the pre-reveal scroll position on cancel', async () => {
			mockUseDashboardSections.mockReturnValue(WITH_SECTIONS);
			const { user } = renderDrawer({ defaultLayoutIndex: 1 });
			const scrollTo = jest.fn();
			// jsdom elements have no scrollTo.
			const scroller = { scrollTo } as unknown as HTMLElement;
			usePanelPickerTargetStore
				.getState()
				.rememberScrollOrigin({ element: scroller, top: 120 });

			await user.click(screen.getByRole('button', { name: 'Cancel' }));

			expect(scrollTo).toHaveBeenCalledWith({
				top: 120,
				behavior: 'smooth',
			});
			expect(target()).toBeNull();
		});

		it('keeps the scroll position when a panel is added', async () => {
			mockUseDashboardSections.mockReturnValue(WITH_SECTIONS);
			const { user } = renderDrawer({ defaultLayoutIndex: 1 });
			const scrollTo = jest.fn();
			// jsdom elements have no scrollTo.
			const scroller = { scrollTo } as unknown as HTMLElement;
			usePanelPickerTargetStore
				.getState()
				.rememberScrollOrigin({ element: scroller, top: 120 });

			await user.click(screen.getByTestId('panel-type-confirm'));

			expect(scrollTo).not.toHaveBeenCalled();
			expect(usePanelPickerTargetStore.getState().scrollOrigin).toBeNull();
		});
	});
});
