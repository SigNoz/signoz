import { DOCS_BASE_URL } from 'constants/app';

export interface McpClient {
	key: string;
	// `label` is the client brand name (Cursor, VS Code, Claude Desktop …).
	// Brand names are not translated.
	label: string;
	docsPath: string;
	snippet: ((endpoint: string) => string) | null;
	// i18n key under the `mcpServer` namespace. Resolved at render time via t().
	instructionsKey?: string;
	installUrl?: (endpoint: string) => string;
	// i18n key for the install button label. Falls back to
	// `step1_add_to_client_prefix` + `label` when not set.
	installLabelKey?: string;
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
		installLabelKey: 'client_cursor_install_label',
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
		installLabelKey: 'client_vscode_install_label',
	},
	{
		key: 'claude-desktop',
		label: 'Claude Desktop',
		docsPath: '/docs/ai/signoz-mcp-server/#claude-desktop',
		snippet: null,
		instructionsKey: 'client_claude_desktop_instructions',
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
		instructionsKey: 'client_other_instructions',
	},
];

export function docsUrl(path: string): string {
	return `${DOCS_BASE_URL}${path}`;
}

export const MCP_DOCS_URL = `${DOCS_BASE_URL}/docs/ai/signoz-mcp-server/`;
export const MCP_USE_CASES_URL = `${DOCS_BASE_URL}/docs/ai/use-cases/`;
