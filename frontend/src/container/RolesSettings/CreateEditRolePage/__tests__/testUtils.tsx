import { render, screen, userEvent, within } from 'tests/test-utils';

import CreateEditRolePage from '../CreateEditRolePage';

type User = ReturnType<typeof userEvent.setup>;

export async function renderCreateRolePage(): Promise<
	ReturnType<typeof render>
> {
	const result = render(<CreateEditRolePage />, undefined, {
		initialRoute: '/settings/roles/new',
	});
	await screen.findByTestId('permission-editor');
	return result;
}

export async function expandResourceCard(resourceId: string): Promise<void> {
	const user = userEvent.setup();
	const card = await screen.findByTestId(`resource-card-${resourceId}`);
	await user.click(
		within(card).getByTestId(`resource-card-header-${resourceId}`),
	);
}

export async function selectOnlySelected(
	user: User,
	resource: string,
): Promise<void> {
	await renderCreateRolePage();
	await expandResourceCard(resource);

	await user.click(
		screen.getByTestId(
			`action-toggle-scope-${resource}-read-button-only_selected`,
		),
	);
}
