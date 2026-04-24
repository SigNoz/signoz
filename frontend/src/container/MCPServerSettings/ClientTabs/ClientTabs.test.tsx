import { render, screen, userEvent } from 'tests/test-utils';

import ClientTabs from './ClientTabs';
import { MCP_CLIENTS } from '../clients';

jest.mock('utils/navigation', () => ({
	openInNewTab: jest.fn(),
}));

const mockOnTabChange = jest.fn();
const mockOnCopySnippet = jest.fn();
const mockOnInstallClick = jest.fn();
const mockOnDocsLinkClick = jest.fn();

const MCP_ENDPOINT = 'https://mcp.us.signoz.cloud/mcp';

const defaultProps = {
	endpoint: MCP_ENDPOINT,
	activeTab: MCP_CLIENTS[0].key,
	onTabChange: mockOnTabChange,
	onCopySnippet: mockOnCopySnippet,
	onInstallClick: mockOnInstallClick,
	onDocsLinkClick: mockOnDocsLinkClick,
};

describe('ClientTabs', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('renders a tab for each MCP client', () => {
		render(<ClientTabs {...defaultProps} />);

		MCP_CLIENTS.forEach((client) => {
			expect(screen.getByText(client.label)).toBeInTheDocument();
		});
	});

	it('renders the snippet for clients that provide one (Cursor)', () => {
		render(<ClientTabs {...defaultProps} activeTab="cursor" />);

		// The snippet is rendered inside a <pre> element; check its content
		const snippetPre = document.querySelector('.mcp-client-tabs__snippet-pre');
		expect(snippetPre).toBeInTheDocument();
		expect(snippetPre?.textContent).toContain(MCP_ENDPOINT);
		expect(snippetPre?.textContent).toContain('mcpServers');
	});

	it('renders endpoint block and instructions text for clients without a snippet (Claude Desktop)', () => {
		render(<ClientTabs {...defaultProps} activeTab="claude-desktop" />);

		const snippetPre = document.querySelector('.mcp-client-tabs__snippet-pre');
		expect(snippetPre?.textContent).toBe(MCP_ENDPOINT);

		expect(
			screen.getByText(
				'Open Claude Desktop, go to Settings → Connectors → Add custom connector, and paste the endpoint URL above. Claude Desktop does not read remote MCP servers from claude_desktop_config.json - the connector UI is the only supported path.',
			),
		).toBeInTheDocument();
	});

	it('shows enabled install button when endpoint is set (Cursor)', () => {
		render(<ClientTabs {...defaultProps} activeTab="cursor" />);

		const installBtn = screen.getByRole('button', {
			name: 'Add to Cursor',
		});
		expect(installBtn).toBeEnabled();
	});

	it('shows disabled install button when endpoint is missing (Cursor)', () => {
		render(<ClientTabs {...defaultProps} endpoint="" activeTab="cursor" />);

		const installBtn = screen.getByRole('button', {
			name: 'Add to Cursor',
		});
		expect(installBtn).toBeDisabled();
	});

	it('calls onCopySnippet with client key and snippet on copy', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const cursorClient = MCP_CLIENTS.find((c) => c.key === 'cursor')!;

		render(<ClientTabs {...defaultProps} activeTab="cursor" />);

		await user.click(
			screen.getByRole('button', {
				name: `Copy ${cursorClient.label} config`,
			}),
		);

		expect(mockOnCopySnippet).toHaveBeenCalledWith(
			'cursor',
			cursorClient.snippet!(MCP_ENDPOINT),
		);
	});

	it('copy button is disabled when no endpoint', () => {
		render(<ClientTabs {...defaultProps} endpoint="" activeTab="cursor" />);

		const cursorClient = MCP_CLIENTS.find((c) => c.key === 'cursor')!;
		const copyBtn = screen.getByRole('button', {
			name: `Copy ${cursorClient.label} config`,
		});

		expect(copyBtn).toBeDisabled();
	});
});
