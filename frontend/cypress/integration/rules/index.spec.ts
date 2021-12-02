/// <reference types="cypress" />

import ROUTES from 'constants/routes';

import defaultRules from '../../fixtures/defaultRules.json';

describe('Alerts', () => {
	beforeEach(() => {
		window.localStorage.setItem('isLoggedIn', 'yes');

		cy
			.intercept('get', '*rules*', {
				fixture: 'defaultRules',
			})
			.as('defaultRules');

		cy.visit(Cypress.env('baseUrl') + `${ROUTES.LIST_ALL_ALERT}`);

		cy.wait('@defaultRules');
	});

	it('Edit Rules Page Failure', async () => {
		cy
			.intercept('**/rules/**', {
				statusCode: 500,
			})
			.as('Get Rules Error');

		cy.get('button.ant-btn.ant-btn-link:nth-child(2)').then((e) => {
			const firstDelete = e[0];
			firstDelete.click();

			cy.waitFor('@Get Rules Error');

			cy
				.window()
				.location()
				.then((e) => {
					expect(e.pathname).to.be.equals(`/alerts/edit/1`);
				});

			cy.findByText('Something went wrong').then((e) => {
				expect(e.length).to.be.equals(1);
			});
		});
	});

	it('Edit Rules Page Success', async () => {
		const text = 'this is the sample value';

		cy
			.intercept('**/rules/**', {
				statusCode: 200,
				body: {
					data: {
						data: text,
					},
				},
			})
			.as('Get Rules Success');

		cy.get('button.ant-btn.ant-btn-link:nth-child(2)').then((e) => {
			const firstDelete = e[0];
			firstDelete.click();

			cy.waitFor('@Get Rules Success');

			cy.wait(1000);

			cy.findByText('Save').then((e) => {
				const [el] = e.get();

				el.click();
			});
		});
	});

	it('All Rules are rendered correctly', async () => {
		cy
			.window()
			.location()
			.then(({ pathname }) => {
				expect(pathname).to.be.equals(ROUTES.LIST_ALL_ALERT);

				cy.get('tbody').then((e) => {
					const tarray = e.children().get();

					expect(tarray.length).to.be.equals(3);

					tarray.forEach(({ children }, index) => {
						const name = children[1]?.textContent;
						const label = children[2]?.textContent;

						expect(name).to.be.equals(defaultRules.data.rules[index].name);

						const defaultLabels = defaultRules.data.rules[index].labels;

						expect(label).to.be.equals(defaultLabels['severity']);
					});
				});
			});
	});

	it('Rules are Deleted', async () => {
		cy
			.intercept('**/rules/**', {
				body: {
					data: 'Deleted',
					message: 'Success',
				},
				statusCode: 200,
			})
			.as('deleteRules');

		cy.get('button.ant-btn.ant-btn-link:first-child').then((e) => {
			const firstDelete = e[0];

			firstDelete.click();
		});

		cy.wait('@deleteRules');

		cy.get('tbody').then((e) => {
			const trray = e.children().get();
			expect(trray.length).to.be.equals(2);
		});
	});
});
