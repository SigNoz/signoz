import '@testing-library/cypress/add-commands';

import CheckRouteDefaultGlobalTimeOptions, {
	CheckRouteDefaultGlobalTimeOptionsProps,
} from '../CustomFunctions/checkRouteDefaultGlobalTimeOptions';
import Login, { LoginProps } from '../CustomFunctions/Login';

Cypress.Commands.add('login', Login);
Cypress.Commands.add(
	'checkDefaultGlobalOption',
	CheckRouteDefaultGlobalTimeOptions,
);

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Cypress {
		interface Chainable {
			login(props: LoginProps): void;
			checkDefaultGlobalOption(
				props: CheckRouteDefaultGlobalTimeOptionsProps,
			): void;
		}
	}
}
