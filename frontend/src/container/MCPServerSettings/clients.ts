import { DOCS_BASE_URL } from 'constants/app';

export interface McpClient {
	key: string;
	label: string;
	docsPath: string;
	snippet: ((endpoint: string) => string) | null;
	instructions?: string;
	installUrl?: (endpoint: string) => string;
	installLabel?: string;
}

function b64url(input: string): string {
	if (typeof btoa === 'function') {
		return btoa(input);
	}
	// fallback for non-browser TS contexts (never hit at runtime)
	return Buffer.from(input, 'utf8').toString('base64');
}

export const MCP_CLIENTS: McpClient[] = [
	{
		key: 'cursor',
		label: 'Cursor',
		docsPath: '/docs/ai/signoz-mcp-server/#cursor',
		snippet: (endpoint): string =>
			JSON.stringify(
				{
					mcpServers: {
						signoz: {
							url: endpoint,
						},
					},
				},
				null,
				2,
			),
		installUrl: (endpoint): string => {
			const config = b64url(JSON.stringify({ url: endpoint }));
			return `cursor://anysphere.cursor-deeplink/mcp/install?name=SigNoz&config=${config}`;
		},
		installLabel: 'Add to Cursor',
	},
	{
		key: 'claude-code',
		label: 'Claude Code',
		docsPath: '/docs/ai/signoz-mcp-server/#claude-code',
		snippet: (endpoint): string =>
			`claude mcp add --scope user --transport http signoz ${endpoint}`,
	},
	{
		key: 'vscode',
		label: 'VS Code',
		docsPath: '/docs/ai/signoz-mcp-server/#vs-code',
		snippet: (endpoint): string =>
			JSON.stringify(
				{
					servers: {
						signoz: {
							type: 'http',
							url: endpoint,
						},
					},
				},
				null,
				2,
			),
		installUrl: (endpoint): string => {
			const payload = encodeURIComponent(
				JSON.stringify({
					name: 'signoz',
					config: { type: 'http', url: endpoint },
				}),
			);
			return `vscode:mcp/install?${payload}`;
		},
		installLabel: 'Add to VS Code',
	},
	{
		key: 'claude-desktop',
		label: 'Claude Desktop',
		docsPath: '/docs/ai/signoz-mcp-server/#claude-desktop',
		snippet: null,
		instructions:
			'Open Claude Desktop, go to Settings → Connectors → Add custom connector, and paste the endpoint URL above. Claude Desktop does not read remote MCP servers from claude_desktop_config.json - the connector UI is the only supported path.',
	},
	{
		key: 'codex',
		label: 'Codex',
		docsPath: '/docs/ai/signoz-mcp-server/#codex',
		snippet: (endpoint): string => `codex mcp add signoz --url ${endpoint}`,
	},
	{
		key: 'other',
		label: 'Other',
		docsPath: '/docs/ai/signoz-mcp-server/',
		snippet: null,
		instructions:
			'Most MCP clients that support remote HTTP servers will accept the endpoint URL above. Add it as a new MCP server in your client and paste your SigNoz API key when the client prompts for authentication. See the docs for client-specific instructions.',
	},
];

export function docsUrl(path: string): string {
	return `${DOCS_BASE_URL}${path}`;
}

export const MCP_DOCS_URL = `${DOCS_BASE_URL}/docs/ai/signoz-mcp-server/`;
export const MCP_USE_CASES_URL = `${DOCS_BASE_URL}/docs/ai/use-cases/`;
