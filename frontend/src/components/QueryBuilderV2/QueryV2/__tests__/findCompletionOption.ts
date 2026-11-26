import { screen, within, type waitForOptions } from 'tests/test-utils';

export function findCompletionOption(
	editorTestId: string,
	label: string,
	options?: waitForOptions,
): Promise<HTMLElement> {
	return within(screen.getByTestId(editorTestId)).findByText(
		(_, element) =>
			element?.getAttribute('role') === 'option' && element.textContent === label,
		undefined,
		options,
	);
}
