/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable sonarjs/no-duplicate-string */
import ROUTES from 'constants/routes';
import { AppState } from 'store/reducers';
import { TraceFilterEnum } from 'types/reducer/trace';

import GraphInitialResponse from '../../fixtures/trace/initialAggregates.json';
import FilterInitialResponse from '../../fixtures/trace/initialSpanFilter.json';
import TableInitialResponse from '../../fixtures/trace/initialSpans.json';

const allFilters = '@Filters.all';
const allGraphs = '@Graph.all';
const allTable = '@Table.all';

describe('Trace', () => {
	beforeEach(() => {
		window.localStorage.setItem('isLoggedIn', 'yes');

		cy
			.intercept('POST', '**/aggregates', {
				fixture: 'trace/initialAggregates',
			})
			.as('Graph');

		cy
			.intercept('POST', '**/getFilteredSpans', {
				fixture: 'trace/initialSpans',
			})
			.as('Table');

		cy
			.intercept('POST', '**/api/v1/getSpanFilters', {
				fixture: 'trace/initialSpanFilter',
			})
			.as('Filters');

		cy.visit(`${Cypress.env('baseUrl')}${ROUTES.TRACE}`);
	});

	it('First Initial Load should go with 3 AJAX request', () => {
		cy.wait(['@Filters', '@Graph', '@Table']).then((e) => {
			const [filter, graph, table] = e;

			const { body: filterBody } = filter.request;
			const { body: graphBody } = graph.request;
			const { body: tableBody } = table.request;

			expect(filterBody.exclude.length).to.equal(0);
			expect(filterBody.getFilters.length).to.equal(3);
			filterBody.getFilters.forEach((filter: TraceFilterEnum) => {
				expect(filter).to.be.oneOf(['duration', 'status', 'serviceName']);
			});

			expect(graphBody.function).to.be.equal('count');
			expect(graphBody.exclude.length).to.be.equal(0);
			expect(typeof graphBody.exclude).to.be.equal('object');

			expect(tableBody.tags.length).to.be.equal(0);
			expect(typeof tableBody.tags).equal('object');

			expect(tableBody.exclude.length).equals(0);
		});
	});

	it('Render Time Request Response In All 3 Request', () => {
		cy.wait(['@Filters', '@Graph', '@Table']).then((e) => {
			const [filter, graph, table] = e;

			expect(filter.response?.body).to.be.not.undefined;
			expect(filter.response?.body).to.be.not.NaN;

			expect(JSON.stringify(filter.response?.body)).to.be.equals(
				JSON.stringify(FilterInitialResponse),
			);

			expect(JSON.stringify(graph.response?.body)).to.be.equals(
				JSON.stringify(GraphInitialResponse),
			);

			expect(JSON.stringify(table.response?.body)).to.be.equals(
				JSON.stringify(TableInitialResponse),
			);
		});
		cy.get(allFilters).should('have.length', 1);
		cy.get(allGraphs).should('have.length', 1);
		cy.get(allTable).should('have.length', 1);
	});

	it('Clear All', () => {
		cy.wait(['@Filters', '@Graph', '@Table']);

		expect(cy.findAllByText('Clear All')).not.to.be.undefined;

		cy
			.window()
			.its('store')
			.invoke('getState')
			.then((e: AppState) => {
				const { traces } = e;
				expect(traces.isFilterExclude.get('status')).to.be.undefined;
				expect(traces.selectedFilter.size).to.be.equals(0);
			});

		cy.findAllByText('Clear All').then((e) => {
			const [firstStatusClear] = e;

			firstStatusClear.click();

			cy.wait(['@Filters', '@Graph', '@Table']);

			// insuring the api get call
			cy.get(allFilters).should('have.length', 2);
			cy.get(allGraphs).should('have.length', 2);
			cy.get(allTable).should('have.length', 2);

			cy
				.window()
				.its('store')
				.invoke('getState')
				.then((e: AppState) => {
					const { traces } = e;

					expect(traces.isFilterExclude.get('status')).to.be.equals(false);
					expect(traces.userSelectedFilter.get('status')).to.be.undefined;
					expect(traces.selectedFilter.size).to.be.equals(0);
				});
		});
	});

	it('Un Selecting one option from status', () => {
		cy.wait(['@Filters', '@Graph', '@Table']);

		cy.get('input[type="checkbox"]').then((e) => {
			const [errorCheckbox] = e;
			errorCheckbox.click();

			cy.wait(['@Filters', '@Graph', '@Table']).then((e) => {
				const [filter, graph, table] = e;
				const filterBody = filter.request.body;
				const graphBody = graph.request.body;
				const tableBody = table.request.body;

				expect(filterBody.exclude).not.to.be.undefined;
				expect(filterBody.exclude.length).not.to.be.equal(0);
				expect(filterBody.exclude[0] === 'status').to.be.true;

				expect(graphBody.exclude).not.to.be.undefined;
				expect(graphBody.exclude.length).not.to.be.equal(0);
				expect(graphBody.exclude[0] === 'status').to.be.true;

				expect(tableBody.exclude).not.to.be.undefined;
				expect(tableBody.exclude.length).not.to.be.equal(0);
				expect(tableBody.exclude[0] === 'status').to.be.true;
			});

			cy.get(allFilters).should('have.length', 2);
			cy.get(allGraphs).should('have.length', 2);
			cy.get(allTable).should('have.length', 2);
		});
	});
});
