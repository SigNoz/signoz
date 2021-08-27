import '@testing-library/cypress/add-commands';

import Login, { LoginProps } from '../CustomFunctions/Login';

Cypress.Commands.add('login', Login);

declare global {
	namespace Cypress {
		interface Chainable<Subject> {
			login(props: LoginProps): void;
		}
	}
}
