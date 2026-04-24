import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
	const { t } = useTranslation('mcpServer');

	const items = useMemo(
		() =>
			MCP_CLIENTS.map((client: McpClient) => {
				const snippet = client.snippet
					? client.snippet(endpoint || ENDPOINT_PLACEHOLDER)
					: null;
				const installHref =
					client.installUrl && endpoint ? client.installUrl(endpoint) : null;

				const installLabel = client.installLabelKey
					? t(client.installLabelKey)
					: `${t('step1_add_to_client_prefix')}${client.label}`;

				return {
					key: client.key,
					label: client.label,
					children: (
						<div className="mcp-client-tabs__snippet-wrapper">
							{snippet !== null ? (
								<div className="mcp-client-tabs__endpoint-value mcp-client-tabs__snippet">
									<pre className="mcp-client-tabs__snippet-pre">{snippet}</pre>
									<CopyIconButton
										ariaLabel={`${t('copy_aria_snippet_prefix')}${client.label}${t('copy_aria_snippet_suffix')}`}
										disabled={!endpoint}
										onCopy={(): void => onCopySnippet(client.key, snippet)}
									/>
								</div>
							) : (
								<p className="mcp-client-tabs__instructions">
									{client.instructionsKey ? t(client.instructionsKey) : ''}
								</p>
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
										{t('step1_manual_fallback')}
									</span>
								</div>
							)}

							<LearnMore
								text={`${client.label}${t('step1_client_docs_suffix')}`}
								url={docsUrl(client.docsPath)}
								onClick={(): void => onDocsLinkClick(`client-${client.key}`)}
							/>
						</div>
					),
				};
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[endpoint, onCopySnippet, onInstallClick, onDocsLinkClick, t],
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
