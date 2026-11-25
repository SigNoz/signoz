import { screen, within } from 'tests/test-utils';

export async function findQueryEditorTextbox(): Promise<HTMLElement> {
	return within(
		await screen.findByTestId('query-where-clause-editor'),
	).getByRole('textbox');
}
