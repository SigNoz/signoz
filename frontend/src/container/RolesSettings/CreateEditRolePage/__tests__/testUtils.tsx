import { Route, Switch } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { render, screen, userEvent } from 'tests/test-utils';
import { TooltipProvider } from '@signozhq/ui/tooltip';

import CreateEditRolePage from '../CreateEditRolePage';

export async function renderCreateRolePage(): Promise<
	ReturnType<typeof render>
> {
	const result = render(
		<TooltipProvider>
			<Switch>
				<Route path={ROUTES.ROLES_SETTINGS} exact>
					<div data-testid="roles-list-redirect" />
				</Route>
				<Route path={ROUTES.ROLE_CREATE}>
					<CreateEditRolePage />
				</Route>
			</Switch>
		</TooltipProvider>,
		undefined,
		{ initialRoute: '/settings/roles/new' },
	);
	await screen.findByTestId('permission-editor');
	return result;
}

export async function expandAllCards(): Promise<void> {
	const user = userEvent.setup();
	const expandButton = await screen.findByTestId('expand-all-button');
	await user.click(expandButton);
}
