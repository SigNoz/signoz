import { render, screen, userEvent } from 'tests/test-utils';

import MCPServerSettings from './MCPServerSettings';

const mockLogEvent = jest.fn();
const mockCopyToClipboard = jest.fn();
const mockHistoryPush = jest.fn();
const mockUseGetGlobalConfig = jest.fn();
const mockUseGetHosts = jest.fn();
const mockUseGetTenantLicense = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastWarning = jest.fn();

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: (...args: unknown[]): unknown => mockLogEvent(...args),
}));

jest.mock('api/generated/services/global', () => ({
	useGetGlobalConfig: (...args: unknown[]): unknown =>
		mockUseGetGlobalConfig(...args),
}));

jest.mock('api/generated/services/zeus', () => ({
	useGetHosts: (...args: unknown[]): unknown => mockUseGetHosts(...args),
}));

jest.mock('hooks/useGetTenantLicense', () => ({
	useGetTenantLicense: (): unknown => mockUseGetTenantLicense(),
}));

jest.mock('react-use', () => ({
	__esModule: true,
	useCopyToClipboard: (): [unknown, jest.Mock] => [null, mockCopyToClipboard],
}));

jest.mock('@signozhq/ui/sonner', () => ({
	...jest.requireActual('@signozhq/ui/sonner'),
	toast: {
		success: (...args: unknown[]): unknown => mockToastSuccess(...args),
		warning: (...args: unknown[]): unknown => mockToastWarning(...args),
	},
}));

jest.mock('lib/history', () => ({
	__esModule: true,
	default: {
		push: (...args: unknown[]): unknown => mockHistoryPush(...args),
		location: { pathname: '/', search: '', hash: '', state: null },
	},
}));

jest.mock('utils/basePath', () => ({
	getBaseUrl: (): string => 'http://localhost',
	getBasePath: (): string => '/',
	withBasePath: (p: string): string => p,
}));

const MCP_URL = 'https://mcp.us.signoz.cloud/mcp';
const CUSTOM_HOST_URL = 'https://myteam.signoz.cloud';
const DEFAULT_HOST_URL = 'https://default.signoz.cloud';

function setupLicense({
	isCloudUser = true,
	isEnterpriseSelfHostedUser = false,
}: {
	isCloudUser?: boolean;
	isEnterpriseSelfHostedUser?: boolean;
} = {}): void {
	mockUseGetTenantLicense.mockReturnValue({
		isCloudUser,
		isEnterpriseSelfHostedUser,
		isCommunityUser: !isCloudUser && !isEnterpriseSelfHostedUser,
		isCommunityEnterpriseUser: false,
	});
}

function setupGlobalConfig({ mcpUrl }: { mcpUrl: string | null }): void {
	mockUseGetGlobalConfig.mockReturnValue({
		data: { data: { mcp_url: mcpUrl, ingestion_url: '' }, status: 'success' },
		isLoading: false,
	});
}

function setupHosts({
	hosts = [],
	isLoading = false,
	isError = false,
}: {
	hosts?: { name?: string; url?: string; is_default?: boolean }[];
	isLoading?: boolean;
	isError?: boolean;
} = {}): void {
	mockUseGetHosts.mockReturnValue({
		data: isLoading || isError ? undefined : { data: { hosts } },
		isLoading,
		isError,
	});
}

describe('MCPServerSettings', () => {
	beforeEach(() => {
		// Default: cloud user, hosts loaded but empty → instanceUrl falls back to getBaseUrl()
		setupLicense();
		setupHosts();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('shows loading spinner while config is loading', () => {
		mockUseGetGlobalConfig.mockReturnValue({
			data: undefined,
			isLoading: true,
		});

		render(<MCPServerSettings />);

		expect(document.querySelector('.ant-spin-spinning')).toBeInTheDocument();
		expect(screen.queryByTestId('mcp-settings')).not.toBeInTheDocument();
	});

	it('shows fallback page when mcp_url is not configured', () => {
		setupGlobalConfig({ mcpUrl: null });

		render(<MCPServerSettings />);

		expect(
			screen.getByText('MCP Server is available on SigNoz'),
		).toBeInTheDocument();
		expect(screen.queryByTestId('mcp-settings')).not.toBeInTheDocument();
	});

	it('renders main settings page when mcp_url is present', () => {
		setupGlobalConfig({ mcpUrl: MCP_URL });

		render(<MCPServerSettings />);

		expect(screen.getByTestId('mcp-settings')).toBeInTheDocument();
		expect(screen.getByText('SigNoz MCP Server')).toBeInTheDocument();
		expect(screen.getByText('Configure your client')).toBeInTheDocument();
		expect(screen.getByText('Authenticate from your client')).toBeInTheDocument();
	});

	it('fires PAGE_VIEWED analytics event on mount', () => {
		setupGlobalConfig({ mcpUrl: MCP_URL });

		render(<MCPServerSettings />, undefined, { role: 'ADMIN' });

		expect(mockLogEvent).toHaveBeenCalledWith('MCP Settings: Page viewed', {
			role: 'ADMIN',
		});
	});

	it('admin sees the Create Service Account CTA', () => {
		setupGlobalConfig({ mcpUrl: MCP_URL });

		render(<MCPServerSettings />, undefined, { role: 'ADMIN' });

		expect(screen.getByText('Create service account')).toBeInTheDocument();
		expect(
			screen.queryByText(
				'Only admins can create API keys. Ask your workspace admin for a key with read access, then paste it into the API Key field.',
			),
		).not.toBeInTheDocument();
	});

	it('non-admin sees an info banner instead of the CTA', () => {
		setupGlobalConfig({ mcpUrl: MCP_URL });

		render(<MCPServerSettings />, undefined, { role: 'VIEWER' });

		expect(
			screen.getByText(
				'Only admins can create API keys. Ask your workspace admin for a key with read access, then paste it into the API Key field.',
			),
		).toBeInTheDocument();
		expect(screen.queryByText('Create service account')).not.toBeInTheDocument();
	});

	it('navigates to service accounts when admin clicks Create CTA', async () => {
		setupGlobalConfig({ mcpUrl: MCP_URL });
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<MCPServerSettings />, undefined, { role: 'ADMIN' });

		await user.click(screen.getByText('Create service account'));

		expect(mockHistoryPush).toHaveBeenCalledWith(
			'/settings/service-accounts?create-sa=true',
		);
	});

	it('copies instance URL and shows success toast', async () => {
		setupGlobalConfig({ mcpUrl: MCP_URL });
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		render(<MCPServerSettings />);

		await user.click(
			screen.getByRole('button', { name: 'Copy SigNoz instance URL' }),
		);

		expect(mockCopyToClipboard).toHaveBeenCalledWith('http://localhost');
		expect(mockToastSuccess).toHaveBeenCalledWith(
			'Instance URL copied to clipboard',
		);
	});

	describe('instance URL resolution', () => {
		it('uses the active custom host URL when available', async () => {
			setupGlobalConfig({ mcpUrl: MCP_URL });
			setupHosts({
				hosts: [
					{ name: 'default', url: DEFAULT_HOST_URL, is_default: true },
					{ name: 'myteam', url: CUSTOM_HOST_URL, is_default: false },
				],
			});
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<MCPServerSettings />);

			expect(screen.getByTestId('mcp-instance-url')).toHaveTextContent(
				CUSTOM_HOST_URL,
			);

			await user.click(
				screen.getByRole('button', { name: 'Copy SigNoz instance URL' }),
			);

			expect(mockCopyToClipboard).toHaveBeenCalledWith(CUSTOM_HOST_URL);
		});

		it('falls back to the default host URL when no custom host exists', async () => {
			setupGlobalConfig({ mcpUrl: MCP_URL });
			setupHosts({
				hosts: [{ name: 'default', url: DEFAULT_HOST_URL, is_default: true }],
			});
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<MCPServerSettings />);

			expect(screen.getByTestId('mcp-instance-url')).toHaveTextContent(
				DEFAULT_HOST_URL,
			);

			await user.click(
				screen.getByRole('button', { name: 'Copy SigNoz instance URL' }),
			);

			expect(mockCopyToClipboard).toHaveBeenCalledWith(DEFAULT_HOST_URL);
		});

		it('falls back to browser URL when hosts request errors', async () => {
			setupGlobalConfig({ mcpUrl: MCP_URL });
			setupHosts({ isError: true });
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<MCPServerSettings />);

			await user.click(
				screen.getByRole('button', { name: 'Copy SigNoz instance URL' }),
			);

			expect(mockCopyToClipboard).toHaveBeenCalledWith('http://localhost');
		});

		it('shows URL skeleton while hosts are loading', () => {
			setupGlobalConfig({ mcpUrl: MCP_URL });
			setupHosts({ isLoading: true });

			render(<MCPServerSettings />);

			expect(screen.queryByTestId('mcp-instance-url')).not.toBeInTheDocument();
			expect(document.querySelector('.ant-skeleton-input')).toBeInTheDocument();
		});

		it('does not copy while hosts are still loading', async () => {
			setupGlobalConfig({ mcpUrl: MCP_URL });
			setupHosts({ isLoading: true });
			userEvent.setup({ pointerEventsCheck: 0 });

			render(<MCPServerSettings />);

			expect(
				screen.queryByRole('button', { name: 'Copy SigNoz instance URL' }),
			).not.toBeInTheDocument();
			expect(mockCopyToClipboard).not.toHaveBeenCalled();
		});

		it('disables the hosts query for non-cloud deployments', () => {
			setupGlobalConfig({ mcpUrl: MCP_URL });
			setupLicense({ isCloudUser: false, isEnterpriseSelfHostedUser: true });

			render(<MCPServerSettings />, undefined, { role: 'ADMIN' });

			const callOptions = mockUseGetHosts.mock.calls[0]?.[0];
			expect(callOptions?.query?.enabled).toBe(false);
		});

		it('uses browser URL immediately for enterprise self-hosted (no skeleton)', async () => {
			setupGlobalConfig({ mcpUrl: MCP_URL });
			setupLicense({ isCloudUser: false, isEnterpriseSelfHostedUser: true });
			setupHosts({ isLoading: false });
			const user = userEvent.setup({ pointerEventsCheck: 0 });

			render(<MCPServerSettings />, undefined, { role: 'ADMIN' });

			expect(
				document.querySelector('.ant-skeleton-input'),
			).not.toBeInTheDocument();
			expect(screen.getByTestId('mcp-instance-url')).toHaveTextContent(
				'http://localhost',
			);

			await user.click(
				screen.getByRole('button', { name: 'Copy SigNoz instance URL' }),
			);

			expect(mockCopyToClipboard).toHaveBeenCalledWith('http://localhost');
		});

		it('enables the hosts query for all cloud users including viewers', () => {
			setupGlobalConfig({ mcpUrl: MCP_URL });
			setupLicense({ isCloudUser: true });

			render(<MCPServerSettings />, undefined, { role: 'VIEWER' });

			const callOptions = mockUseGetHosts.mock.calls[0]?.[0];
			expect(callOptions?.query?.enabled).toBe(true);
		});

		it('shows instance URL for cloud viewer', () => {
			setupGlobalConfig({ mcpUrl: MCP_URL });
			setupLicense({ isCloudUser: true });
			setupHosts({
				hosts: [{ name: 'default', url: DEFAULT_HOST_URL, is_default: true }],
			});

			render(<MCPServerSettings />, undefined, { role: 'VIEWER' });

			expect(
				document.querySelector('.ant-skeleton-input'),
			).not.toBeInTheDocument();
			expect(screen.getByTestId('mcp-instance-url')).toHaveTextContent(
				DEFAULT_HOST_URL,
			);
		});
	});
});
