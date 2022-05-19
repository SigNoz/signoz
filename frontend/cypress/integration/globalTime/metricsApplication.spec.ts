/// <reference types="cypress" />
import getGlobalDropDownFormatedDate from 'lib/getGlobalDropDownFormatedDate';
import { AppState } from 'store/reducers';

import topEndPoints from '../../fixtures/topEndPoints.json';

describe('Global Time Metrics Application', () => {
	beforeEach(() => {
		cy.visit(Cypress.env('baseUrl'));

		const testEmail = 'test@test.com';
		const firstName = 'Test';

		cy.login({
			email: testEmail,
			name: firstName,
		});
	});

	it('Metrics Application', async () => {
		cy
			.intercept('GET', '/api/v1/services*', {
				fixture: 'defaultApp.json',
			})
			.as('defaultApps');

		cy.wait('@defaultApps');

		// clicking on frontend
		cy.get('tr:nth-child(1) > td:first-child').click();

		cy
			.intercept('GET', '/api/v1/service/top_endpoints*', {
				fixture: 'topEndPoints.json',
			})
			.as('topEndPoints');

		cy
			.intercept('GET', '/api/v1/service/overview?*', {
				fixture: 'serviceOverview.json',
			})
			.as('serviceOverview');

		cy
			.intercept(
				'GET',
				`/api/v1/query_range?query=sum(rate(signoz_latency_count*`,
				{
					fixture: 'requestPerSecond.json',
				},
			)
			.as('requestPerSecond');

		cy
			.window()
			.its('store')
			.invoke('getState')
			.then((e: AppState) => {
				const { globalTime } = e;

				const { maxTime, minTime } = globalTime;

				// intercepting metrics application call

				cy.wait('@topEndPoints');
				cy.wait('@serviceOverview');
				// TODO add errorPercentage also
				// cy.wait('@errorPercentage');
				cy.wait('@requestPerSecond');

				cy
					.get('tbody tr:first-child td:first-child')
					.then((el) => {
						const elements = el.get();

						expect(elements.length).to.be.equals(1);

						const element = elements[0];

						expect(element.innerText).to.be.equals(topEndPoints[0].name);
					})
					.click();

				cy
					.findAllByTestId('dropDown')
					.find('span.ant-select-selection-item')
					.then((e) => {
						const elements = e;

						const element = elements[0];

						const customSelectedTime = element.innerText;

						const startTime = new Date(minTime / 1000000);
						const endTime = new Date(maxTime / 1000000);

						const startString = getGlobalDropDownFormatedDate(startTime);
						const endString = getGlobalDropDownFormatedDate(endTime);

						const result = `${startString} - ${endString}`;

						expect(customSelectedTime).to.be.equals(result);
					});

				cy
					.findByTestId('dropDown')
					.click()
					.then(() => {
						cy.findByTitle('Last 30 min').click();
					});

				cy
					.findByTestId('dropDown')
					.find('span.ant-select-selection-item')
					.then((e) => {
						const elements = e;

						const element = elements[0];

						const selectedTime = element.innerText;

						expect(selectedTime).to.be.equals('Last 30 min');
					});
			});
	});
});
