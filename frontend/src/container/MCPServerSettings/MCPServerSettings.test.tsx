import { render, screen, userEvent } from 'tests/test-utils';

import MCPServerSettings from './MCPServerSettings';

const mockLogEvent = jest.fn();
const mockCopyToClipboard = jest.fn();
const mockHistoryPush = jest.fn();
const mockUseGetGlobalConfig = jest.fn();
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

jest.mock('react-use', () => ({
	__esModule: true,
	useCopyToClipboard: (): [unknown, jest.Mock] => [null, mockCopyToClipboard],
}));

jest.mock('@signozhq/ui', () => ({
	...jest.requireActual('@signozhq/ui'),
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

function setupGlobalConfig({ mcpUrl }: { mcpUrl: string | null }): void {
	mockUseGetGlobalConfig.mockReturnValue({
		data: { data: { mcp_url: mcpUrl, ingestion_url: '' }, status: 'success' },
		isLoading: false,
	});
}

describe('MCPServerSettings', () => {
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
});
