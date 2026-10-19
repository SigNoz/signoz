import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import { READ_ONLY_TOOLTIP } from '../constants';
import InsertVariableMenu from '../InsertVariableMenu';
import type { EditorVariable } from '../types';

const VARIABLES: EditorVariable[] = [
	{ name: 'environment', badge: 'QUERY' },
	{ name: 'service', badge: 'CUSTOM' },
	{ name: 'service_version' },
];

function renderMenu(disabled = false): jest.Mock {
	const onSelect = jest.fn();
	render(
		<InsertVariableMenu
			variables={VARIABLES}
			onSelect={onSelect}
			disabled={disabled}
		/>,
	);
	return onSelect;
}

function rowNames(): string[] {
	return screen
		.queryAllByTestId(/^markdown-variable-/)
		.map((row) => row.getAttribute('data-testid') ?? '');
}

describe('InsertVariableMenu', () => {
	it('narrows the rows to names matching the search', async () => {
		renderMenu();
		await userEvent.click(screen.getByTestId('markdown-insert-variable'));
		await screen.findByTestId('markdown-variable-environment');
		expect(rowNames()).toHaveLength(3);

		await userEvent.type(screen.getByPlaceholderText('Search variables'), 'SERV');

		await waitFor(() =>
			expect(rowNames()).toStrictEqual([
				'markdown-variable-service',
				'markdown-variable-service_version',
			]),
		);
	});

	it('hands the clicked variable name to onSelect', async () => {
		const onSelect = renderMenu();
		await userEvent.click(screen.getByTestId('markdown-insert-variable'));
		await userEvent.click(await screen.findByTestId('markdown-variable-service'));

		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect).toHaveBeenCalledWith('service');
	});

	it('stays closed and explains why when read-only', async () => {
		const onSelect = renderMenu(true);
		const trigger = screen.getByTestId('markdown-insert-variable');
		expect(trigger).toHaveAttribute('aria-disabled', 'true');

		await userEvent.click(trigger);
		expect(screen.queryByRole('menu')).not.toBeInTheDocument();
		expect(rowNames()).toHaveLength(0);

		await userEvent.hover(trigger);
		await expect(screen.findByRole('tooltip')).resolves.toHaveTextContent(
			READ_ONLY_TOOLTIP,
		);
		expect(onSelect).not.toHaveBeenCalled();
	});
});
