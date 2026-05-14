import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import { SA_QUERY_PARAMS } from 'container/ServiceAccountsSettings/constants';
import { useGetGlobalConfig } from 'api/generated/services/global';
import { useGetHosts } from 'api/generated/services/zeus';
import history from 'lib/history';
import { useAppContext } from 'providers/App/App';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { USER_ROLES } from 'types/roles';
import { getBaseUrl } from 'utils/basePath';

import { Badge } from '@signozhq/ui/badge';
import { toast } from '@signozhq/ui/sonner';
import Spinner from 'components/Spinner';
import AuthCard from './AuthCard/AuthCard';
import ClientTabs from './ClientTabs/ClientTabs';
import NotCloudFallback from './NotCloudFallback/NotCloudFallback';
import UseCasesCard from './UseCasesCard/UseCasesCard';
import { MCP_CLIENTS } from './clients';

import './MCPServerSettings.styles.scss';

const ANALYTICS = {
	PAGE_VIEWED: 'MCP Settings: Page viewed',
	CREATE_SA_CLICKED: 'MCP Settings: Create service account clicked',
	CLIENT_TAB_SELECTED: 'MCP Settings: Client tab selected',
	SNIPPET_COPIED: 'MCP Settings: Client snippet copied',
	ONE_CLICK_INSTALL_CLICKED: 'MCP Settings: One-click install clicked',
	INSTANCE_URL_COPIED: 'MCP Settings: Instance URL copied',
	DOCS_LINK_CLICKED: 'MCP Settings: Docs link clicked',
} as const;

function MCPServerSettings(): JSX.Element {
	const { user } = useAppContext();
	const [, copyToClipboard] = useCopyToClipboard();

	const isAdmin = user.role === USER_ROLES.ADMIN;
	const { isCloudUser } = useGetTenantLicense();

	const {
		data: hostsData,
		isLoading: isLoadingHosts,
		isError: isHostsError,
	} = useGetHosts({ query: { enabled: isCloudUser } });

	const instanceUrl = useMemo(() => {
		if (isLoadingHosts || isHostsError || !hostsData) {
			return getBaseUrl();
		}
		const hosts = hostsData.data?.hosts ?? [];
		const activeHost =
			hosts.find((h) => !h.is_default) ?? hosts.find((h) => h.is_default);
		return activeHost?.url ?? getBaseUrl();
	}, [hostsData, isLoadingHosts, isHostsError]);

	const { data: globalConfig, isLoading: isConfigLoading } =
		useGetGlobalConfig();
	const endpoint = globalConfig?.data?.mcp_url ?? '';

	const [activeTab, setActiveTab] = useState<string>(MCP_CLIENTS[0]?.key ?? '');

	useEffect(() => {
		void logEvent(ANALYTICS.PAGE_VIEWED, {
			role: user.role,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleCopySnippet = useCallback(
		(clientKey: string, snippet: string) => {
			if (!endpoint) {
				toast.warning('Enter your Cloud region before copying');
				return;
			}
			copyToClipboard(snippet);
			toast.success('Snippet copied to clipboard');
			void logEvent(ANALYTICS.SNIPPET_COPIED, { client: clientKey });
		},
		[endpoint, copyToClipboard],
	);

	const handleCreateServiceAccount = useCallback(() => {
		void logEvent(ANALYTICS.CREATE_SA_CLICKED, {});
		history.push(
			`${ROUTES.SERVICE_ACCOUNTS_SETTINGS}?${SA_QUERY_PARAMS.CREATE_SA}=true`,
		);
	}, []);

	const handleCopyInstanceUrl = useCallback(() => {
		if (isLoadingHosts) {
			return;
		}
		copyToClipboard(instanceUrl);
		toast.success('Instance URL copied to clipboard');
		void logEvent(ANALYTICS.INSTANCE_URL_COPIED, {});
	}, [copyToClipboard, instanceUrl, isLoadingHosts]);

	const handleDocsLinkClick = useCallback((target: string) => {
		void logEvent(ANALYTICS.DOCS_LINK_CLICKED, { target });
	}, []);

	const handleInstallClick = useCallback((clientKey: string) => {
		void logEvent(ANALYTICS.ONE_CLICK_INSTALL_CLICKED, { client: clientKey });
	}, []);

	const handleTabChange = useCallback((key: string) => {
		setActiveTab(key);
		void logEvent(ANALYTICS.CLIENT_TAB_SELECTED, { client: key });
	}, []);

	if (isConfigLoading) {
		return <Spinner tip="Loading..." height="70vh" />;
	}

	if (!endpoint) {
		return <NotCloudFallback />;
	}

	return (
		<div className="mcp-settings" data-testid="mcp-settings">
			<header className="mcp-settings__header">
				<h1 className="mcp-settings__header-title">SigNoz MCP Server</h1>
				<p className="mcp-settings__header-subtitle">
					Connect AI assistants like Claude, Cursor, VS Code, and Codex to your
					SigNoz data via the Model Context Protocol. Authenticate from your MCP
					client with a service-account API key.
				</p>
			</header>

			<section className="mcp-settings__card">
				<h3 className="mcp-settings__card-title">
					<Badge color="secondary" variant="default">
						1
					</Badge>
					Configure your client
				</h3>
				<p className="mcp-settings__card-description">
					Add SigNoz to your MCP client. Use a one-click install where available, or
					copy the config for manual setup. On first connect, the client will open a
					SigNoz authorization page - use the instance URL and API key from step 2.
				</p>
				<ClientTabs
					endpoint={endpoint}
					activeTab={activeTab}
					onTabChange={handleTabChange}
					onCopySnippet={handleCopySnippet}
					onInstallClick={handleInstallClick}
					onDocsLinkClick={handleDocsLinkClick}
				/>
			</section>

			<AuthCard
				isAdmin={isAdmin}
				instanceUrl={instanceUrl}
				isLoadingInstanceUrl={isLoadingHosts}
				onCopyInstanceUrl={handleCopyInstanceUrl}
				onCreateServiceAccount={handleCreateServiceAccount}
			/>

			<UseCasesCard onDocsLinkClick={handleDocsLinkClick} />
		</div>
	);
}

export default MCPServerSettings;
