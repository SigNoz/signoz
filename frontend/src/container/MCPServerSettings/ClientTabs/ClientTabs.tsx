import { useMemo } from 'react';
import { Button, Tabs } from '@signozhq/ui';
import LearnMore from 'components/LearnMore/LearnMore';
import { Download } from '@signozhq/icons';
import { openInNewTab } from 'utils/navigation';
import CopyIconButton from '../CopyIconButton';
import { docsUrl, MCP_CLIENTS, McpClient } from '../clients';

import './ClientTabs.styles.scss';

const ENDPOINT_PLACEHOLDER = 'https://mcp.<region>.signoz.cloud/mcp';

interface ClientTabsProps {
	endpoint: string;
	activeTab: string;
	onTabChange: (key: string) => void;
	onCopySnippet: (clientKey: string, snippet: string) => void;
	onInstallClick: (clientKey: string) => void;
	onDocsLinkClick: (target: string) => void;
}

function ClientTabs({
	endpoint,
	activeTab,
	onTabChange,
	onCopySnippet,
	onInstallClick,
	onDocsLinkClick,
}: ClientTabsProps): JSX.Element {
	const items = useMemo(
		() =>
			MCP_CLIENTS.map((client: McpClient) => {
				const snippet = client.snippet
					? client.snippet(endpoint || ENDPOINT_PLACEHOLDER)
					: null;
				const installHref =
					client.installUrl && endpoint ? client.installUrl(endpoint) : null;

				const installLabel = client.installLabel ?? `Add to ${client.label}`;

				return {
					key: client.key,
					label: client.label,
					children: (
						<div className="mcp-client-tabs__snippet-wrapper">
							{snippet !== null ? (
								<div className="mcp-client-tabs__endpoint-value mcp-client-tabs__snippet">
									<pre className="mcp-client-tabs__snippet-pre">{snippet}</pre>
									<CopyIconButton
										ariaLabel={`Copy ${client.label} config`}
										disabled={!endpoint}
										onCopy={(): void => onCopySnippet(client.key, snippet)}
									/>
								</div>
							) : (
								<>
									<div className="mcp-client-tabs__endpoint-value mcp-client-tabs__snippet">
										<pre className="mcp-client-tabs__snippet-pre">
											{endpoint || ENDPOINT_PLACEHOLDER}
										</pre>
										<CopyIconButton
											ariaLabel="Copy MCP endpoint"
											disabled={!endpoint}
											onCopy={(): void => onCopySnippet(client.key, endpoint)}
										/>
									</div>
									<p className="mcp-client-tabs__instructions">
										{client.instructions ?? ''}
									</p>
								</>
							)}

							{client.installUrl && (
								<div className="mcp-client-tabs__install-row">
									{installHref ? (
										<Button
											variant="solid"
											color="primary"
											prefix={<Download size={14} />}
											onClick={(): void => {
												onInstallClick(client.key);
												openInNewTab(installHref);
											}}
										>
											{installLabel}
										</Button>
									) : (
										<Button
											variant="solid"
											color="primary"
											disabled
											prefix={<Download size={14} />}
										>
											{installLabel}
										</Button>
									)}
									<span className="mcp-client-tabs__helper-text">
										Or copy the config below for manual setup.
									</span>
								</div>
							)}

							<LearnMore
								text={`${client.label} setup docs`}
								url={docsUrl(client.docsPath)}
								onClick={(): void => onDocsLinkClick(`client-${client.key}`)}
							/>
						</div>
					),
				};
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[endpoint, onCopySnippet, onInstallClick, onDocsLinkClick],
	);

	return (
		<Tabs
			className="mcp-client-tabs-root"
			value={activeTab}
			onChange={onTabChange}
			items={items}
		/>
	);
}

export default ClientTabs;
