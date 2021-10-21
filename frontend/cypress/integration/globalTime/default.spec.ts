/// <reference types="cypress" />
import ROUTES from 'constants/routes';

describe('default time', () => {
	beforeEach(() => {
		window.localStorage.setItem('isLoggedIn', 'yes');
	});

	it('Metrics Page default time', () => {
		cy.checkDefaultGlobalOption({
			route: ROUTES.APPLICATION,
		});
	});

	it('Dashboard Page default time', () => {
		cy.checkDefaultGlobalOption({
			route: ROUTES.ALL_DASHBOARD,
		});
	});

	it('Trace Page default time', () => {
		cy.checkDefaultGlobalOption({
			route: ROUTES.TRACES,
		});
	});

	it('Instrumentation Page default time', () => {
		cy.checkDefaultGlobalOption({
			route: ROUTES.INSTRUMENTATION,
		});
	});

	it('Service Page default time', () => {
		cy.checkDefaultGlobalOption({
			route: ROUTES.SERVICE_MAP,
		});
	});

	it('Settings Page default time', () => {
		cy.checkDefaultGlobalOption({
			route: ROUTES.SETTINGS,
		});
	});
});
