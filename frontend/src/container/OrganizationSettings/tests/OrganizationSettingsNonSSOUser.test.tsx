import { act, fireEvent, screen, within } from 'tests/test-utils';

import commonTests from './OrganizationSettingsCommonTests.test';

describe('Organization Settings Page', () => {
	commonTests();
	describe('Authenticated Domains', () => {
		let authenticatedDomainsSection: HTMLElement;
		beforeEach(() => {
			authenticatedDomainsSection = screen.getByTestId(
				'authenticated-domains-section',
			);
		});
		describe('Should display the Authenticated domains section properly:', () => {
			it('Should check if "Authenticated Domains" title is present', () => {
				expect(
					within(authenticatedDomainsSection).getByText('authenticated_domains'),
				).toBeInTheDocument();
			});

			it('Should check if the "Add Domains" button is displayed', () => {
				expect(
					within(authenticatedDomainsSection).getByText('add_domain'),
				).toBeInTheDocument();
			});
		});
		describe('Should check if Add Domains modal is properly displayed:', () => {
			let addDomainsModal: HTMLElement;
			beforeEach(async () => {
				const addDomainsButton = within(authenticatedDomainsSection).getByText(
					'add_domain',
				);
				act(() => {
					fireEvent.click(addDomainsButton);
				});
				addDomainsModal = await screen.findByTestId('add-domain-modal');
			});

			it('Should check if "Add Domains" is displayed in the header', async () => {
				const addDomainsModalTitle = await within(addDomainsModal).findAllByText(
					'Add Domain',
				);
				expect(addDomainsModalTitle[0]).toBeInTheDocument();
			});
			it('Should check if the x icon is displayed', () => {
				const xButton = within(addDomainsModal).getByRole('button', {
					name: /close/i,
				});
				expect(xButton).toBeInTheDocument();
			});
			it('Should check if text box is displayed', () => {
				const domainInput = within(addDomainsModal).getByPlaceholderText(
					'signoz.io',
				);
				expect(domainInput).toBeInTheDocument();
			});
			it('Should check if clicking on Add domains shows "Please enter a valid domain" if text box is empty', async () => {
				const domainInput = within(addDomainsModal).getByPlaceholderText(
					'signoz.io',
				);
				act(() => {
					fireEvent.change(domainInput, {
						target: { value: 'signoz.io' },
					});
					fireEvent.change(domainInput, {
						target: { value: '' },
					});
				});
				expect(
					await within(addDomainsModal).findByText('Please enter a valid domain'),
				).toBeInTheDocument();
			});
			it('Should check if x icon closes the modal', () => {
				const xButton = within(addDomainsModal).getByRole('button', {
					name: /close/i,
				});
				expect(xButton).toBeInTheDocument();
				act(() => {
					fireEvent.click(xButton);
				});
				expect(addDomainsModal).not.toBeInTheDocument();
			});
		});
		it('Should check if the table columns are displayed properly (Domain, Enforce SSO + help icon, Action)', () => {
			['Domain', 'Enforce SSO', 'Action'].forEach((column) => {
				expect(
					within(authenticatedDomainsSection).getByText(column),
				).toBeInTheDocument();
			});
		});
	});
});
