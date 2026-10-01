import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

// The editor resolves its panel from the dashboard document before it renders.
const PAGE_LOAD = { timeout: 10000 };

/**
 * Opens a display-options section and scrolls it to the top of the pane, where
 * a screenshot of the viewport can see it. Returns the section to query in.
 */
export const expandSection = async (title: string): Promise<HTMLElement> => {
	// The toggle's test id is the title, lowercased, with whitespace as dashes.
	const toggle = await screen.findByTestId(
		`config-section-${title.toLowerCase().replace(/\s+/g, '-')}`,
		{},
		PAGE_LOAD,
	);

	if (toggle.getAttribute('aria-expanded') !== 'true') {
		await userEvent.click(toggle);
	}
	toggle.scrollIntoView({ block: 'start' });

	return toggle.closest('section') ?? document.body;
};

/** Picks one tile of a radio-tile control by its value. */
export const pickSegment = async (
	testId: string,
	value: string,
): Promise<void> => {
	const radio = (): HTMLElement =>
		within(screen.getByTestId(`${testId}-${value}`)).getByRole('radio');

	// A pick made while the editor still seeds its draft from the panel is
	// dropped, so it is made again until it holds.
	await waitFor(async () => {
		if (!(radio() as HTMLInputElement).checked) {
			await userEvent.click(radio());
		}
		await expect(radio()).toBeChecked();
	}, PAGE_LOAD);
};

/**
 * The pane's pickers are antd Selects: the element carrying the test id does
 * nothing on click, the combobox inside it is what opens the list.
 */
export const openConfigSelect = async (testId: string): Promise<void> => {
	const select = await screen.findByTestId(testId, {}, PAGE_LOAD);

	await userEvent.click(within(select).getByRole('combobox'));
};

/**
 * Opens Thresholds and adds one row through the section's own button, whose
 * test id depends on the panel kind.
 */
export const addThreshold = async (
	testId = 'panel-editor-v2-add-threshold',
): Promise<void> => {
	const section = await expandSection('Thresholds');

	await userEvent.click(within(section).getByTestId(testId));
};

export const openLinkDialog = async (): Promise<void> => {
	const section = await expandSection('Context Links');

	// The header's quick add carries the same name, so the body button goes by id.
	await userEvent.click(within(section).getByTestId('panel-editor-v2-add-link'));
	await screen.findByTestId('context-link-dialog');
};
