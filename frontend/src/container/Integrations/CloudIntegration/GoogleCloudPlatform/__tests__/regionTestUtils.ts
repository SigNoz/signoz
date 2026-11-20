import { screen, userEvent } from 'tests/test-utils';

/** Types the label into the search and presses Enter: jsdom drops a click on a Combobox row. */
export const selectRegion = async (
	user: ReturnType<typeof userEvent.setup>,
	label: string,
): Promise<void> => {
	await user.click(screen.getByTestId('gcp-deployment-region-select'));
	await user.type(
		await screen.findByTestId('gcp-deployment-region-select-search'),
		`${label}{Enter}`,
	);
};
