import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TFunction, useTranslation } from 'react-i18next';
import { useCopyToClipboard } from 'react-use';
import { Button, Input, Tabs, Tooltip, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import LearnMore from 'components/LearnMore/LearnMore';
import ROUTES from 'constants/routes';
import { SA_QUERY_PARAMS } from 'container/ServiceAccountsSettings/constants';
import { useGetGlobalConfig } from 'hooks/globalConfig/useGetGlobalConfig';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import {
	Copy,
	Download,
	Info,
	KeyRound,
	Sparkles,
	TriangleAlert,
} from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { USER_ROLES } from 'types/roles';

import {
	docsUrl,
	MCP_CLIENTS,
	MCP_DOCS_URL,
	MCP_USE_CASES_URL,
	McpClient,
} from './clients';
import {
	buildMcpEndpoint,
	getCloudRegion,
	normalizeRegion,
	parseRegionFromUrl,
} from './getCloudRegion';

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

const ENDPOINT_PLACEHOLDER = 'https://mcp.<region>.signoz.cloud/mcp';

function NotCloudFallback(): JSX.Element {
	const { t } = useTranslation('mcpServer');
	const onClick = useCallback(() => {
		logEvent(ANALYTICS.DOCS_LINK_CLICKED, { target: 'fallback' });
	}, []);
	return (
		<div className="mcp-settings">
			<div className="mcp-settings__fallback">
				<div className="mcp-settings__fallback-title">
					<Sparkles size={18} /> {t('fallback_title')}
				</div>
				<Typography.Text className="mcp-settings__fallback-body">
					{t('fallback_body')}
				</Typography.Text>
				<LearnMore
					text={t('fallback_docs_link')}
					url={MCP_DOCS_URL}
					onClick={onClick}
				/>
			</div>
		</div>
	);
}

interface CopyIconButtonProps {
	ariaLabel: string;
	onCopy: () => void;
	disabled?: boolean;
}

function CopyIconButton({
	ariaLabel,
	onCopy,
	disabled,
}: CopyIconButtonProps): JSX.Element {
	const { t } = useTranslation('mcpServer');
	const tooltipTitle = disabled
		? t('copy_tooltip_disabled')
		: t('copy_tooltip_enabled');
	const button = (
		<Button
			type="text"
			size="small"
			aria-label={ariaLabel}
			disabled={disabled}
			className="mcp-settings__copy-btn"
			icon={<Copy size={14} />}
			onClick={onCopy}
		/>
	);
	// Ant Design Tooltip doesn't reliably surface for a disabled Button —
	// wrap in a span so hover/focus still reaches the Tooltip.
	return (
		<Tooltip title={tooltipTitle}>
			{disabled ? <span>{button}</span> : button}
		</Tooltip>
	);
}

CopyIconButton.defaultProps = {
	disabled: false,
};

interface RegionFallbackCardProps {
	manualRegion: string;
	onRegionChange: (value: string) => void;
	onIngestionLinkClick: () => void;
	t: TFunction<'mcpServer'>;
}

function RegionFallbackCard({
	manualRegion,
	onRegionChange,
	onIngestionLinkClick,
	t,
}: RegionFallbackCardProps): JSX.Element {
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => onRegionChange(e.target.value),
		[onRegionChange],
	);
	return (
		<div className="mcp-settings__card mcp-settings__region-card">
			<div className="mcp-settings__region-warning">
				<TriangleAlert size={14} />
				<span>
					{t('region_warning_prefix')}
					<Button
						type="link"
						size="small"
						className="mcp-settings__inline-link"
						onClick={onIngestionLinkClick}
					>
						{t('region_warning_link')}
					</Button>
					{t('region_warning_suffix')}
				</span>
			</div>
			<label
				className="mcp-settings__auth-field-label"
				htmlFor="mcp-settings-manual-region"
			>
				{t('region_input_label')}
			</label>
			<Input
				id="mcp-settings-manual-region"
				className="mcp-settings__endpoint-input"
				size="small"
				value={manualRegion}
				placeholder={t('region_input_placeholder')}
				aria-label={t('region_input_label')}
				onChange={handleChange}
			/>
		</div>
	);
}

interface ClientTabsProps {
	endpoint: string;
	activeTab: string;
	onTabChange: (key: string) => void;
	onCopySnippet: (clientKey: string, snippet: string) => void;
	onInstallClick: (clientKey: string) => void;
	onDocsLinkClick: (target: string) => void;
	t: TFunction<'mcpServer'>;
}

interface ClientTabChildrenProps {
	client: McpClient;
	endpoint: string;
	onCopySnippet: (clientKey: string, snippet: string) => void;
	onInstallClick: (clientKey: string) => void;
	onDocsLinkClick: (target: string) => void;
	t: TFunction<'mcpServer'>;
}

function ClientTabChildren({
	client,
	endpoint,
	onCopySnippet,
	onInstallClick,
	onDocsLinkClick,
	t,
}: ClientTabChildrenProps): JSX.Element {
	const snippet = client.snippet
		? client.snippet(endpoint || ENDPOINT_PLACEHOLDER)
		: null;
	const installHref =
		client.installUrl && endpoint ? client.installUrl(endpoint) : null;

	const handleInstallClick = useCallback(() => onInstallClick(client.key), [
		onInstallClick,
		client.key,
	]);
	const handleDocsClick = useCallback(
		() => onDocsLinkClick(`client-${client.key}`),
		[onDocsLinkClick, client.key],
	);
	const handleSnippetCopy = useCallback(() => {
		if (snippet) {
			onCopySnippet(client.key, snippet);
		}
	}, [onCopySnippet, client.key, snippet]);

	const installLabel = client.installLabelKey
		? t(client.installLabelKey)
		: `${t('step1_add_to_client_prefix')}${client.label}`;
	const instructions = client.instructionsKey ? t(client.instructionsKey) : '';

	return (
		<div className="mcp-settings__snippet-wrapper">
			{client.installUrl && (
				<div className="mcp-settings__install-row">
					<Button
						type="primary"
						disabled={!installHref}
						icon={<Download size={14} />}
						href={installHref ?? undefined}
						onClick={handleInstallClick}
					>
						{installLabel}
					</Button>
					<Typography.Text className="mcp-settings__helper-text">
						{t('step1_manual_fallback')}
					</Typography.Text>
				</div>
			)}
			{snippet !== null ? (
				<div className="mcp-settings__endpoint-value mcp-settings__snippet">
					<pre className="mcp-settings__snippet-pre">{snippet}</pre>
					<CopyIconButton
						ariaLabel={`${t('copy_aria_snippet_prefix')}${client.label}${t(
							'copy_aria_snippet_suffix',
						)}`}
						disabled={!endpoint}
						onCopy={handleSnippetCopy}
					/>
				</div>
			) : (
				<Typography.Text className="mcp-settings__card-description">
					{instructions}
				</Typography.Text>
			)}
			<LearnMore
				text={`${client.label}${t('step1_client_docs_suffix')}`}
				url={docsUrl(client.docsPath)}
				onClick={handleDocsClick}
			/>
		</div>
	);
}

function ClientTabs({
	endpoint,
	activeTab,
	onTabChange,
	onCopySnippet,
	onInstallClick,
	onDocsLinkClick,
	t,
}: ClientTabsProps): JSX.Element {
	const items = useMemo(
		() =>
			MCP_CLIENTS.map((client: McpClient) => ({
				key: client.key,
				label: client.label,
				children: (
					<ClientTabChildren
						client={client}
						endpoint={endpoint}
						onCopySnippet={onCopySnippet}
						onInstallClick={onInstallClick}
						onDocsLinkClick={onDocsLinkClick}
						t={t}
					/>
				),
			})),
		[endpoint, onCopySnippet, onInstallClick, onDocsLinkClick, t],
	);

	return (
		<Tabs
			className="mcp-settings__tabs-container"
			activeKey={activeTab}
			onChange={onTabChange}
			items={items}
		/>
	);
}

interface AuthCardProps {
	isAdmin: boolean;
	instanceUrl: string;
	onCopyInstanceUrl: () => void;
	onCreateServiceAccount: () => void;
	t: TFunction<'mcpServer'>;
}

function AuthCard({
	isAdmin,
	instanceUrl,
	onCopyInstanceUrl,
	onCreateServiceAccount,
	t,
}: AuthCardProps): JSX.Element {
	return (
		<section className="mcp-settings__card mcp-settings__cta-card">
			<h3 className="mcp-settings__card-title">
				<span className="mcp-settings__step-badge">2</span> {t('step2_title')}
			</h3>
			<Typography.Text className="mcp-settings__card-description">
				{t('step2_description')}
			</Typography.Text>
			<div className="mcp-settings__auth-field">
				<Typography.Text className="mcp-settings__auth-field-label">
					{t('step2_instance_url_label')}
				</Typography.Text>
				<div className="mcp-settings__endpoint-value">
					<span data-testid="mcp-instance-url">{instanceUrl}</span>
					<CopyIconButton
						ariaLabel={t('copy_aria_instance_url')}
						onCopy={onCopyInstanceUrl}
					/>
				</div>
			</div>
			<div className="mcp-settings__auth-field">
				<Typography.Text className="mcp-settings__auth-field-label">
					{t('step2_api_key_label')}
				</Typography.Text>
				{isAdmin ? (
					<div className="mcp-settings__cta-row">
						<Button
							type="primary"
							icon={<KeyRound size={14} />}
							onClick={onCreateServiceAccount}
						>
							{t('step2_admin_cta')}
						</Button>
						<Typography.Text className="mcp-settings__helper-text">
							{t('step2_admin_helper')}
						</Typography.Text>
					</div>
				) : (
					<div className="mcp-settings__info-banner-inline">
						<Info size={14} />
						<Typography.Text className="mcp-settings__helper-text">
							{t('step2_viewer_helper')}
						</Typography.Text>
					</div>
				)}
			</div>
		</section>
	);
}

interface UseCasesCardProps {
	onDocsLinkClick: (target: string) => void;
	t: TFunction<'mcpServer'>;
}

function UseCasesCard({ onDocsLinkClick, t }: UseCasesCardProps): JSX.Element {
	const handleClick = useCallback(() => onDocsLinkClick('use-cases'), [
		onDocsLinkClick,
	]);
	return (
		<section className="mcp-settings__card mcp-settings__use-cases">
			<h3 className="mcp-settings__card-title">{t('use_cases_title')}</h3>
			<ul className="mcp-settings__use-cases-list">
				<li>{t('use_cases_item_1')}</li>
				<li>{t('use_cases_item_2')}</li>
				<li>{t('use_cases_item_3')}</li>
				<li>{t('use_cases_item_4')}</li>
			</ul>
			<LearnMore
				text={t('use_cases_docs_link')}
				url={MCP_USE_CASES_URL}
				onClick={handleClick}
			/>
		</section>
	);
}

function MCPServerSettings(): JSX.Element {
	const { t } = useTranslation('mcpServer');
	const { user } = useAppContext();
	const { isCloudUser } = useGetTenantLicense();
	const { notifications } = useNotifications();
	const [, copyToClipboard] = useCopyToClipboard();

	const isAdmin = user.role === USER_ROLES.ADMIN;
	const instanceUrl = window.location.origin;

	const {
		data: globalConfig,
		isFetched: isGlobalConfigFetched,
	} = useGetGlobalConfig();
	const regionFromHost = useMemo(() => getCloudRegion(), []);
	const regionFromIngestion = useMemo(
		() =>
			globalConfig?.data?.ingestion_url
				? parseRegionFromUrl(globalConfig.data.ingestion_url)
				: null,
		[globalConfig?.data?.ingestion_url],
	);

	const autoDetectedRegion = regionFromHost.region ?? regionFromIngestion;

	const [manualRegion, setManualRegion] = useState<string>('');
	const [activeTab, setActiveTab] = useState<string>(MCP_CLIENTS[0]?.key ?? '');

	const resolvedRegion: string | null =
		autoDetectedRegion ?? normalizeRegion(manualRegion);

	const endpoint = resolvedRegion ? buildMcpEndpoint(resolvedRegion) : '';

	const hasLoggedPageViewRef = useRef(false);
	useEffect(() => {
		// Wait for globalConfig to resolve so `region` reflects the settled value.
		// Without this gate, PAGE_VIEWED fires once on mount and again when the
		// async ingestion_url arrives and changes autoDetectedRegion.
		if (hasLoggedPageViewRef.current || !isGlobalConfigFetched) {
			return;
		}
		hasLoggedPageViewRef.current = true;
		logEvent(ANALYTICS.PAGE_VIEWED, {
			isCloudUser,
			role: user.role,
			region: autoDetectedRegion,
			isAutoDetected: Boolean(autoDetectedRegion),
		});
	}, [isGlobalConfigFetched, isCloudUser, user.role, autoDetectedRegion]);

	const handleCopySnippet = useCallback(
		(clientKey: string, snippet: string) => {
			if (!endpoint) {
				notifications.warning({ message: t('toast_region_required') });
				return;
			}
			copyToClipboard(snippet);
			notifications.success({ message: t('toast_snippet_copied') });
			logEvent(ANALYTICS.SNIPPET_COPIED, { client: clientKey });
		},
		[endpoint, copyToClipboard, notifications, t],
	);

	const handleCreateServiceAccount = useCallback(() => {
		logEvent(ANALYTICS.CREATE_SA_CLICKED, {});
		history.push(
			`${ROUTES.SERVICE_ACCOUNTS_SETTINGS}?${SA_QUERY_PARAMS.CREATE_SA}=true`,
		);
	}, []);

	const handleCopyInstanceUrl = useCallback(() => {
		copyToClipboard(instanceUrl);
		notifications.success({ message: t('toast_instance_url_copied') });
		logEvent(ANALYTICS.INSTANCE_URL_COPIED, {});
	}, [copyToClipboard, instanceUrl, notifications, t]);

	const handleDocsLinkClick = useCallback((target: string) => {
		logEvent(ANALYTICS.DOCS_LINK_CLICKED, { target });
	}, []);

	const handleIngestionLinkClick = useCallback(() => {
		logEvent(ANALYTICS.DOCS_LINK_CLICKED, { target: 'ingestion-settings' });
		history.push(ROUTES.INGESTION_SETTINGS);
	}, []);

	const handleInstallClick = useCallback((clientKey: string) => {
		logEvent(ANALYTICS.ONE_CLICK_INSTALL_CLICKED, { client: clientKey });
	}, []);

	const handleTabChange = useCallback((key: string) => {
		setActiveTab(key);
		logEvent(ANALYTICS.CLIENT_TAB_SELECTED, { client: key });
	}, []);

	if (!isCloudUser) {
		return <NotCloudFallback />;
	}

	return (
		<div className="mcp-settings" data-testid="mcp-settings">
			<header className="mcp-settings__header">
				<h2 className="mcp-settings__header-title">
					<Sparkles size={20} /> {t('page_title')}
				</h2>
				<Typography.Text className="mcp-settings__header-subtitle">
					{t('page_subtitle')}
				</Typography.Text>
			</header>

			{!autoDetectedRegion && (
				<RegionFallbackCard
					manualRegion={manualRegion}
					onRegionChange={setManualRegion}
					onIngestionLinkClick={handleIngestionLinkClick}
					t={t}
				/>
			)}

			<section className="mcp-settings__card">
				<h3 className="mcp-settings__card-title">
					<span className="mcp-settings__step-badge">1</span> {t('step1_title')}
				</h3>
				<Typography.Text className="mcp-settings__card-description">
					{t('step1_description')}
				</Typography.Text>
				<ClientTabs
					endpoint={endpoint}
					activeTab={activeTab}
					onTabChange={handleTabChange}
					onCopySnippet={handleCopySnippet}
					onInstallClick={handleInstallClick}
					onDocsLinkClick={handleDocsLinkClick}
					t={t}
				/>
			</section>

			<AuthCard
				isAdmin={isAdmin}
				instanceUrl={instanceUrl}
				onCopyInstanceUrl={handleCopyInstanceUrl}
				onCreateServiceAccount={handleCreateServiceAccount}
				t={t}
			/>

			<UseCasesCard onDocsLinkClick={handleDocsLinkClick} t={t} />
		</div>
	);
}

export default MCPServerSettings;
