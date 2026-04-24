import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCopyToClipboard } from 'react-use';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import { SA_QUERY_PARAMS } from 'container/ServiceAccountsSettings/constants';
import { useGetGlobalConfig } from 'api/generated/services/global';
import history from 'lib/history';
import { useAppContext } from 'providers/App/App';
import { USER_ROLES } from 'types/roles';
import { getBaseUrl } from 'utils/basePath';

import { Badge, toast } from '@signozhq/ui';
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
	const { t } = useTranslation('mcpServer');
	const { user } = useAppContext();
	const [, copyToClipboard] = useCopyToClipboard();

	const isAdmin = user.role === USER_ROLES.ADMIN;
	const instanceUrl = getBaseUrl();

	const { data: globalConfig, isLoading: isConfigLoading } = useGetGlobalConfig();
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
				toast.warning(t('toast_region_required'));
				return;
			}
			copyToClipboard(snippet);
			toast.success(t('toast_snippet_copied'));
			void logEvent(ANALYTICS.SNIPPET_COPIED, { client: clientKey });
		},
		[endpoint, copyToClipboard, t],
	);

	const handleCreateServiceAccount = useCallback(() => {
		void logEvent(ANALYTICS.CREATE_SA_CLICKED, {});
		history.push(
			`${ROUTES.SERVICE_ACCOUNTS_SETTINGS}?${SA_QUERY_PARAMS.CREATE_SA}=true`,
		);
	}, []);

	const handleCopyInstanceUrl = useCallback(() => {
		copyToClipboard(instanceUrl);
		toast.success(t('toast_instance_url_copied'));
		void logEvent(ANALYTICS.INSTANCE_URL_COPIED, {});
	}, [copyToClipboard, instanceUrl, t]);

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
				<h1 className="mcp-settings__header-title">{t('page_title')}</h1>
				<p className="mcp-settings__header-subtitle">{t('page_subtitle')}</p>
			</header>

			<section className="mcp-settings__card">
				<h3 className="mcp-settings__card-title">
					<Badge color="secondary" variant='default'>1</Badge>
					{t('step1_title')}
				</h3>
				<p className="mcp-settings__card-description">{t('step1_description')}</p>
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
				onCopyInstanceUrl={handleCopyInstanceUrl}
				onCreateServiceAccount={handleCreateServiceAccount}
			/>

			<UseCasesCard onDocsLinkClick={handleDocsLinkClick} />
		</div>
	);
}

export default MCPServerSettings;
