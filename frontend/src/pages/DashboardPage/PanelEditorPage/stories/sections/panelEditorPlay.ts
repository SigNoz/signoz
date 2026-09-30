import { screen, userEvent, within } from 'storybook/test';

// The editor resolves its panel from the dashboard document before it renders.
const PAGE_LOAD = { timeout: 10000 };

/**
 * Opens a display-options section and scrolls it to the top of the pane, where
 * a screenshot of the viewport can see it. Returns the section to query in.
 */
export const expandSection = async (title: string): Promise<HTMLElement> => {
	const toggle = await screen.findByRole('button', { name: title }, PAGE_LOAD);

	if (toggle.getAttribute('aria-expanded') !== 'true') {
		await userEvent.click(toggle);
	}
	toggle.scrollIntoView({ block: 'start' });

	return toggle.closest('section') ?? document.body;
};

/** Picks one option of a segmented control by the label it shows. */
export const pickSegment = async (
	testId: string,
	label: string,
): Promise<void> => {
	await userEvent.click(within(screen.getByTestId(testId)).getByText(label));
};

/**
 * The pane's pickers are antd Selects: the element carrying the test id does
 * nothing on click, the combobox inside it is what opens the list.
 */
export const openConfigSelect = async (testId: string): Promise<void> => {
	const select = await screen.findByTestId(testId, {}, PAGE_LOAD);

	await userEvent.click(within(select).getByRole('combobox'));
};

/** Opens Thresholds and adds one row through the section's own button. */
export const addThreshold = async (): Promise<void> => {
	const section = await expandSection('Thresholds');

	await userEvent.click(
		within(section).getByRole('button', { name: 'Add threshold' }),
	);
};

export const openLinkDialog = async (): Promise<void> => {
	const section = await expandSection('Context Links');

	// The header's quick add carries the same name, so the body button goes by id.
	await userEvent.click(within(section).getByTestId('panel-editor-v2-add-link'));
	await screen.findByTestId('context-link-dialog');
};
