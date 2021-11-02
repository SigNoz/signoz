/// <reference types="cypress" />
import ROUTES from 'constants/routes';
import convertToNanoSecondsToSecond from 'lib/convertToNanoSecondsToSecond';

import defaultApps from '../../fixtures/defaultApp.json';

describe('Metrics', () => {
	beforeEach(() => {
		cy.visit(Cypress.env('baseUrl'));

		const testEmail = 'test@test.com';
		const firstName = 'Test';

		cy.login({
			email: testEmail,
			name: firstName,
		});
	});

	it('Default Apps', () => {
		cy
			.intercept('GET', '/api/v1/services*', {
				fixture: 'defaultApp.json',
			})
			.as('defaultApps');

		cy.wait('@defaultApps');

		cy.location().then((e) => {
			expect(e.pathname).to.be.equals(ROUTES.APPLICATION);

			cy.get('tbody').then((elements) => {
				const trElements = elements.children();
				expect(trElements.length).to.be.equal(defaultApps.length);
				const getChildren = (row: Element): Element => {
					if (row.children.length === 0) {
						return row;
					}
					return getChildren(row.children[0]);
				};

				// this is row element
				trElements.map((index, element) => {
					const [
						applicationElement,
						p99Element,
						errorRateElement,
						rpsElement,
					] = element.children;
					const applicationName = getChildren(applicationElement).innerHTML;
					const p99Name = getChildren(p99Element).innerHTML;
					const errorRateName = getChildren(errorRateElement).innerHTML;
					const rpsName = getChildren(rpsElement).innerHTML;
					const { serviceName, p99, errorRate, callRate } = defaultApps[index];
					expect(applicationName).to.be.equal(serviceName);
					expect(p99Name).to.be.equal(convertToNanoSecondsToSecond(p99).toString());
					expect(errorRateName).to.be.equals(
						parseFloat(errorRate.toString()).toFixed(2),
					);
					expect(rpsName).to.be.equals(callRate.toString());
				});
			});
		});
	});
});

export {};
