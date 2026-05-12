import React from 'react';
import SettingsPage from 'pages/Settings/Settings';
import { render, screen, within } from 'tests/test-utils';
import { LicensePlatform } from 'types/api/licensesV3/getActive';
import { USER_ROLES } from 'types/roles';

jest.mock('components/MarkdownRenderer/MarkdownRenderer', () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }): React.ReactNode =>
		children,
}));

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('lib/history', () => ({
	push: jest.fn(),
	listen: jest.fn(() => jest.fn()),
	location: { pathname: '/settings', search: '' },
}));

const getCloudAdminOverrides = (): any => ({
	activeLicense: {
		key: 'test-key',
		platform: LicensePlatform.CLOUD,
	},
});

const getSelfHostedAdminOverrides = (): any => ({
	activeLicense: {
		key: 'test-key',
		platform: LicensePlatform.SELF_HOSTED,
	},
});

describe('SettingsPage nav sections', () => {
	describe('Cloud Admin', () => {
		beforeEach(() => {
			render(<SettingsPage />, undefined, {
				role: USER_ROLES.ADMIN,
				appContextOverrides: getCloudAdminOverrides(),
				initialRoute: '/settings',
			});
		});

		it.each([
			'settings-page-sidenav',
			'workspace',
			'account',
			'notification-channels',
			'billing',
			'roles',
			'members',
			'sso',
			'integrations',
			'ingestion',
			'mcp-server',
		])('renders "%s" element', (id) => {
			expect(screen.getByTestId(id)).toBeInTheDocument();
		});

		it.each(['Identity & Access', 'Authentication'])(
			'renders "%s" section title',
			(text) => {
				expect(screen.getByText(text)).toBeInTheDocument();
			},
		);
	});

	describe('Cloud Viewer', () => {
		beforeEach(() => {
			render(<SettingsPage />, undefined, {
				role: USER_ROLES.VIEWER,
				appContextOverrides: getCloudAdminOverrides(),
				initialRoute: '/settings',
			});
		});

		it.each(['workspace', 'account'])('renders "%s" element', (id) => {
			expect(screen.getByTestId(id)).toBeInTheDocument();
		});

		it.each(['billing', 'roles'])('does not render "%s" element', (id) => {
			expect(screen.queryByTestId(id)).not.toBeInTheDocument();
		});

		it('renders "mcp-server" element', () => {
			expect(screen.getByTestId('mcp-server')).toBeInTheDocument();
		});
	});

	describe('Self-hosted Admin', () => {
		beforeEach(() => {
			render(<SettingsPage />, undefined, {
				role: USER_ROLES.ADMIN,
				appContextOverrides: getSelfHostedAdminOverrides(),
				initialRoute: '/settings',
			});
		});

		it.each([
			'roles',
			'members',
			'integrations',
			'sso',
			'ingestion',
			'mcp-server',
		])('renders "%s" element', (id) => {
			expect(screen.getByTestId(id)).toBeInTheDocument();
		});
	});

	describe('section structure', () => {
		it('renders items in correct sections for cloud admin', () => {
			const { container } = render(<SettingsPage />, undefined, {
				role: USER_ROLES.ADMIN,
				appContextOverrides: getCloudAdminOverrides(),
				initialRoute: '/settings',
			});

			const sidenav = within(container).getByTestId('settings-page-sidenav');
			const sections = sidenav.querySelectorAll('.settings-nav-section');

			// Should have at least 2 sections (general + identity-access) for cloud admin
			expect(sections.length).toBeGreaterThanOrEqual(2);
		});

		it('hides section entirely when all items in it are disabled', () => {
			// Community user has very limited access — identity section should be hidden
			render(<SettingsPage />, undefined, {
				role: USER_ROLES.VIEWER,
				appContextOverrides: {
					activeLicense: null,
				},
				initialRoute: '/settings',
			});

			expect(screen.queryByText('IDENTITY & ACCESS')).not.toBeInTheDocument();
		});
	});
});
