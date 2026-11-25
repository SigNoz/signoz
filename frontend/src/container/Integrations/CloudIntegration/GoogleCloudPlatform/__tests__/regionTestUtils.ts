import { screen, userEvent } from 'tests/test-utils';

/** Pastes the label into the search and presses Enter: jsdom drops a click on a Combobox row. */
export const selectRegion = async (
	user: ReturnType<typeof userEvent.setup>,
	label: string,
): Promise<void> => {
	await user.click(screen.getByTestId('gcp-deployment-region-select'));
	await user.click(
		await screen.findByTestId('gcp-deployment-region-select-search'),
	);
	await user.paste(label);
	await user.keyboard('{Enter}');
};
