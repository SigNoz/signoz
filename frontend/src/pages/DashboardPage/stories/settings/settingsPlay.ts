import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

// The dashboard document loads before the toolbar renders.
const PAGE_LOAD = { timeout: 10000 };

export type SettingsTab = 'Overview' | 'Variables' | 'Publish';

export type VariableType = 'dynamic' | 'textbox' | 'custom' | 'query';

type RowAction = 'Edit variable' | 'Delete variable' | 'Apply to all';

/** Opens the settings drawer from the toolbar and returns the tab's panel. */
export const openSettings = async (
	canvasElement: HTMLElement,
	tab: SettingsTab = 'Overview',
): Promise<HTMLElement> => {
	await userEvent.click(
		await within(canvasElement).findByRole(
			'button',
			{ name: 'Configure' },
			PAGE_LOAD,
		),
	);

	if (tab !== 'Overview') {
		await userEvent.click(await screen.findByRole('tab', { name: tab }));
	}

	return screen.findByRole('tabpanel');
};

export const variableRow = (name: string): Promise<HTMLElement> =>
	screen.findByTestId(`variable-row-${name}`, {}, PAGE_LOAD);

/** Row actions render once the edit permission resolves. */
export const clickRowAction = async (
	name: string,
	action: RowAction,
): Promise<void> => {
	const row = await variableRow(name);

	await userEvent.click(
		await within(row).findByRole('button', { name: action }, PAGE_LOAD),
	);
};

/** A new variable's editor, which opens on the Dynamic type. */
export const openNewVariable = async (
	canvasElement: HTMLElement,
): Promise<void> => {
	const panel = await openSettings(canvasElement, 'Variables');
	const add = await within(panel).findByRole(
		'button',
		{ name: 'Add variable' },
		PAGE_LOAD,
	);

	// Disabled until its permission check resolves: through `disabled` or
	// `aria-disabled`, depending on the Button.
	await waitFor(() => expect(add).toBeEnabled(), PAGE_LOAD);
	await waitFor(
		() => expect(add).not.toHaveAttribute('aria-disabled', 'true'),
		PAGE_LOAD,
	);
	await userEvent.click(add);
	await screen.findByText('Variable Type');
};

export const openVariableEditor = async (
	canvasElement: HTMLElement,
	name: string,
): Promise<void> => {
	await openSettings(canvasElement, 'Variables');
	await clickRowAction(name, 'Edit variable');
	await screen.findByText('Variable Type');
};

/**
 * A value in the editor's preview. The toolbar's selector for the same variable
 * resolves to its first value too, whenever its own query returns.
 */
export const findPreviewValue = async (value: string): Promise<HTMLElement> => {
	const label = await screen.findByText('Preview of Values');

	return within(label.parentElement as HTMLElement).findByText(
		value,
		undefined,
		PAGE_LOAD,
	);
};

export const pickVariableType = async (type: VariableType): Promise<void> => {
	await userEvent.click(await screen.findByTestId(`variable-type-${type}`));
};

export const typeVariableName = async (name: string): Promise<void> => {
	const input = await screen.findByTestId('variable-name');

	await userEvent.clear(input);
	await userEvent.type(input, name);
};

/**
 * The editor's pickers are antd Selects: the element carrying the test id does
 * nothing on click, the combobox inside it is what opens the list.
 */
export const openVariableSelect = async (testId: string): Promise<void> => {
	const select = await screen.findByTestId(testId);

	await userEvent.click(within(select).getByRole('combobox'));
};
