import { screen, userEvent, waitFor } from 'tests/test-utils';

const ROLE_TRIGGER_TEST_ID = /^invite-role-[0-9a-f-]{36}$/;

type User = ReturnType<typeof userEvent.setup>;

export function getRoleTrigger(rowIndex: number): HTMLElement {
	return screen.getAllByTestId(ROLE_TRIGGER_TEST_ID)[rowIndex];
}

// jsdom cannot deliver the pointer click Base UI expects on an option, so the
// option is reached with the arrow keys and picked with Enter.
export async function pickRole(
	user: User,
	rowIndex: number,
	roleId: string,
): Promise<void> {
	const triggerTestId = getRoleTrigger(rowIndex).getAttribute('data-testid');
	const itemTestId = `${triggerTestId}-item-${roleId}`;

	await user.click(getRoleTrigger(rowIndex));

	const item = await screen.findByTestId(itemTestId);
	const index = screen
		.getAllByTestId(new RegExp(`^${triggerTestId}-item-`))
		.indexOf(item);
	await waitFor(() =>
		expect(screen.getByTestId(`${triggerTestId}-search`)).toHaveFocus(),
	);
	await user.keyboard(`${'{ArrowDown}'.repeat(index + 1)}{Enter}`);
	await waitFor(() =>
		expect(screen.getByTestId(itemTestId)).toHaveAttribute(
			'aria-selected',
			'true',
		),
	);

	await user.keyboard('{Escape}');
	await waitFor(() =>
		expect(getRoleTrigger(rowIndex)).toHaveAttribute('aria-expanded', 'false'),
	);
}
