import { render, screen, userEvent, within } from 'tests/test-utils';
import { TooltipProvider } from '@signozhq/ui/tooltip';

import CreateEditRolePage from '../CreateEditRolePage';

export async function renderCreateRolePage(): Promise<
	ReturnType<typeof render>
> {
	const result = render(
		<TooltipProvider>
			<CreateEditRolePage />
		</TooltipProvider>,
		undefined,
		{ initialRoute: '/settings/roles/new' },
	);
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
