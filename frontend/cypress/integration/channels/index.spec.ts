/// <reference types="cypress" />

import ROUTES from 'constants/routes';

import defaultAllChannels from '../../fixtures/defaultAllChannels.json';

describe('Channels', () => {
	beforeEach(() => {
		window.localStorage.setItem('isLoggedIn', 'yes');

		cy.visit(Cypress.env('baseUrl') + ROUTES.ALL_CHANNELS);
	});

	it('Channels', () => {
		cy
			.intercept('**channels**', {
				statusCode: 200,
				fixture: 'defaultAllChannels',
			})
			.as('All Channels');

		cy.wait('@All Channels');

		cy
			.get('.ant-tabs-tab')
			.children()
			.then((e) => {
				const child = e.get();

				const secondChild = child[1];

				expect(secondChild.outerText).to.be.equals('Alert Channels');

				expect(secondChild.ariaSelected).to.be.equals('true');
			});

		cy
			.get('tbody')
			.should('be.visible')
			.then((e) => {
				const allChildren = e.children().get();
				expect(allChildren.length).to.be.equals(defaultAllChannels.data.length);

				allChildren.forEach((e, index) => {
					expect(e.firstChild?.textContent).not.null;
					expect(e.firstChild?.textContent).to.be.equals(
						defaultAllChannels.data[index].name,
					);
				});
			});
	});
});
