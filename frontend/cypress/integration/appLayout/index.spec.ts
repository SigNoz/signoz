/// <reference types="cypress" />
import ROUTES from 'constants/routes';

describe('App Layout', () => {
	beforeEach(() => {
		cy.visit(Cypress.env('baseUrl'));
	});

	it('Check the user is in Logged Out State', async () => {
		cy.location('pathname').then((e) => {
			expect(e).to.be.equal(ROUTES.SIGN_UP);
		});
	});

	it('Logged In State', () => {
		const testEmail = 'test@test.com';
		const firstName = 'Test';

		cy.login({
			email: testEmail,
			name: firstName,
		});
	});
});

export {};
