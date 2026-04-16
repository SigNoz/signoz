import { FeatureKeys } from 'constants/features';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { render, screen, userEvent } from 'tests/test-utils';
import { USER_ROLES } from 'types/roles';

import LicenseRowDismissibleCallout from '../LicenseRowDismissibleCallout';

const getDescription = (): HTMLElement =>
	screen.getByText(
		(_, el) =>
			el?.classList?.contains('license-key-callout__description') ?? false,
	);

const queryDescription = (): HTMLElement | null =>
	screen.queryByText(
		(_, el) =>
			el?.classList?.contains('license-key-callout__description') ?? false,
	);

jest.mock('hooks/useGetTenantLicense', () => ({
	useGetTenantLicense: jest.fn(),
}));

const mockLicense = (isCloudUser: boolean): void => {
	(useGetTenantLicense as jest.Mock).mockReturnValue({
		isCloudUser,
		isEnterpriseSelfHostedUser: !isCloudUser,
		isCommunityUser: false,
		isCommunityEnterpriseUser: false,
	});
};

const renderCallout = (
	role: string,
	isCloudUser: boolean,
	gatewayActive: boolean,
): void => {
	mockLicense(isCloudUser);
	render(
		<LicenseRowDismissibleCallout />,
		{},
		{
			role,
			appContextOverrides: {
				featureFlags: [
					{
						name: FeatureKeys.GATEWAY,
						active: gatewayActive,
						usage: 0,
						usage_limit: -1,
						route: '',
					},
				],
			},
		},
	);
};

describe('LicenseRowDismissibleCallout', () => {
	beforeEach(() => {
		localStorage.clear();
		jest.clearAllMocks();
	});

	describe('callout content per access level', () => {
		it.each([
			{
				scenario: 'viewer, non-cloud, gateway off — base text only, no links',
				role: USER_ROLES.VIEWER,
				isCloudUser: false,
				gatewayActive: false,
				serviceAccountLink: false,
				ingestionLink: false,
				expectedText: 'This is NOT your ingestion or Service account key.',
			},
			{
				scenario: 'admin, non-cloud, gateway off — service accounts link only',
				role: USER_ROLES.ADMIN,
				isCloudUser: false,
				gatewayActive: false,
				serviceAccountLink: true,
				ingestionLink: false,
				expectedText:
					'This is NOT your ingestion or Service account key. Find your Service account here.',
			},
			{
				scenario: 'viewer, cloud, gateway off — ingestion link only',
				role: USER_ROLES.VIEWER,
				isCloudUser: true,
				gatewayActive: false,
				serviceAccountLink: false,
				ingestionLink: true,
				expectedText:
					'This is NOT your ingestion or Service account key. Find your Ingestion key here.',
			},
			{
				scenario: 'admin, cloud, gateway off — both links',
				role: USER_ROLES.ADMIN,
				isCloudUser: true,
				gatewayActive: false,
				serviceAccountLink: true,
				ingestionLink: true,
				expectedText:
					'This is NOT your ingestion or Service account key. Find your Service account here and Ingestion key here.',
			},
			{
				scenario: 'admin, non-cloud, gateway on — both links',
				role: USER_ROLES.ADMIN,
				isCloudUser: false,
				gatewayActive: true,
				serviceAccountLink: true,
				ingestionLink: true,
				expectedText:
					'This is NOT your ingestion or Service account key. Find your Service account here and Ingestion key here.',
			},
			{
				scenario: 'editor, non-cloud, gateway on — ingestion link only',
				role: USER_ROLES.EDITOR,
				isCloudUser: false,
				gatewayActive: true,
				serviceAccountLink: false,
				ingestionLink: true,
				expectedText:
					'This is NOT your ingestion or Service account key. Find your Ingestion key here.',
			},
			{
				scenario: 'editor, cloud, gateway off — ingestion link only',
				role: USER_ROLES.EDITOR,
				isCloudUser: true,
				gatewayActive: false,
				serviceAccountLink: false,
				ingestionLink: true,
				expectedText:
					'This is NOT your ingestion or Service account key. Find your Ingestion key here.',
			},
		])(
			'$scenario',
			({
				role,
				isCloudUser,
				gatewayActive,
				serviceAccountLink,
				ingestionLink,
				expectedText,
			}) => {
				renderCallout(role, isCloudUser, gatewayActive);

				const description = getDescription();
				expect(description).toBeInTheDocument();
				expect(description).toHaveTextContent(expectedText);

				if (serviceAccountLink) {
					expect(
						screen.getByRole('link', { name: /Service account here/ }),
					).toBeInTheDocument();
				} else {
					expect(
						screen.queryByRole('link', { name: /Service account here/ }),
					).not.toBeInTheDocument();
				}

				if (ingestionLink) {
					expect(
						screen.getByRole('link', { name: /Ingestion key here/ }),
					).toBeInTheDocument();
				} else {
					expect(
						screen.queryByRole('link', { name: /Ingestion key here/ }),
					).not.toBeInTheDocument();
				}
			},
		);
	});

	describe('Link routing', () => {
		it('should link to service accounts settings', () => {
			renderCallout(USER_ROLES.ADMIN, false, false);

			const link = screen.getByRole('link', {
				name: /Service account here/,
			}) as HTMLAnchorElement;

			expect(link.getAttribute('href')).toBe(ROUTES.SERVICE_ACCOUNTS_SETTINGS);
		});

		it('should link to ingestion settings', () => {
			renderCallout(USER_ROLES.VIEWER, true, false);

			const link = screen.getByRole('link', {
				name: /Ingestion key here/,
			}) as HTMLAnchorElement;

			expect(link.getAttribute('href')).toBe(ROUTES.INGESTION_SETTINGS);
		});
	});

	describe('Dismissal functionality', () => {
		it('should hide callout when dismiss button is clicked', async () => {
			const user = userEvent.setup();
			renderCallout(USER_ROLES.ADMIN, false, false);

			expect(getDescription()).toBeInTheDocument();

			await user.click(screen.getByRole('button'));

			expect(queryDescription()).not.toBeInTheDocument();
		});

		it('should persist dismissal in localStorage', async () => {
			const user = userEvent.setup();
			renderCallout(USER_ROLES.ADMIN, false, false);

			await user.click(screen.getByRole('button'));

			expect(
				localStorage.getItem(LOCALSTORAGE.LICENSE_KEY_CALLOUT_DISMISSED),
			).toBe('true');
		});

		it('should not render when localStorage dismissal is set', () => {
			localStorage.setItem(LOCALSTORAGE.LICENSE_KEY_CALLOUT_DISMISSED, 'true');
			renderCallout(USER_ROLES.ADMIN, false, false);

			expect(queryDescription()).not.toBeInTheDocument();
		});
	});
});
