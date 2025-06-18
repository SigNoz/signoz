/* eslint-disable sonarjs/no-duplicate-string */
import './Home.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Alert, Button, Popover } from 'antd';
import logEvent from 'api/common/logEvent';
import { HostListPayload } from 'api/infraMonitoring/getHostLists';
import { K8sPodsListPayload } from 'api/infraMonitoring/getK8sPodsList';
import listUserPreferences from 'api/v1/user/preferences/list';
import updateUserPreferenceAPI from 'api/v1/user/preferences/name/update';
import Header from 'components/Header/Header';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { FeatureKeys } from 'constants/features';
import { LOCALSTORAGE } from 'constants/localStorage';
import { ORG_PREFERENCES } from 'constants/orgPreferences';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import { getHostListsQuery } from 'container/InfraMonitoringHosts/utils';
import { useGetHostList } from 'hooks/infraMonitoring/useGetHostList';
import { useGetK8sPodsList } from 'hooks/infraMonitoring/useGetK8sPodsList';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import history from 'lib/history';
import cloneDeep from 'lodash-es/cloneDeep';
import { CompassIcon, DotIcon, HomeIcon, Plus, Wrench, X } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import * as motion from 'motion/react-client';
import Card from 'periscope/components/Card/Card';
import { useAppContext } from 'providers/App/App';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import { UserPreference } from 'types/api/preferences/preference';
import { DataSource } from 'types/common/queryBuilder';
import { USER_ROLES } from 'types/roles';
import { popupContainer } from 'utils/selectPopupContainer';

import AlertRules from './AlertRules/AlertRules';
import { defaultChecklistItemsState } from './constants';
import Dashboards from './Dashboards/Dashboards';
import DataSourceInfo from './DataSourceInfo/DataSourceInfo';
import HomeChecklist, { ChecklistItem } from './HomeChecklist/HomeChecklist';
import SavedViews from './SavedViews/SavedViews';
import Services from './Services/Services';
import StepsProgress from './StepsProgress/StepsProgress';

const homeInterval = 30 * 60 * 1000;

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function Home(): JSX.Element {
	const { user } = useAppContext();

	const [startTime, setStartTime] = useState<number | null>(null);
	const [endTime, setEndTime] = useState<number | null>(null);
	const [updatingUserPreferences, setUpdatingUserPreferences] = useState(false);
	const [loadingUserPreferences, setLoadingUserPreferences] = useState(true);

	const { isCommunityUser, isCommunityEnterpriseUser } = useGetTenantLicense();

	const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(
		defaultChecklistItemsState,
	);

	const [isWelcomeChecklistSkipped, setIsWelcomeChecklistSkipped] = useState(
		false,
	);

	const [isBannerDismissed, setIsBannerDismissed] = useState(false);

	useEffect(() => {
		const bannerDismissed = localStorage.getItem(LOCALSTORAGE.BANNER_DISMISSED);
		setIsBannerDismissed(bannerDismissed === 'true');
	}, []);

	useEffect(() => {
		const now = new Date();
		const startTime = new Date(now.getTime() - homeInterval);
		const endTime = now;

		setStartTime(startTime.getTime());
		setEndTime(endTime.getTime());
	}, []);

	// Detect Logs
	const { data: logsData, isLoading: isLogsLoading } = useGetQueryRange(
		{
			query: initialQueriesMap[DataSource.LOGS],
			graphType: PANEL_TYPES.TABLE,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: '30m',
			params: {
				dataSource: DataSource.LOGS,
			},
		},
		DEFAULT_ENTITY_VERSION,
		{
			queryKey: [
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				'30m',
				endTime || Date.now(),
				startTime || Date.now(),
				initialQueriesMap[DataSource.LOGS],
			],
			enabled: !!startTime && !!endTime,
		},
	);

	// Detect Traces
	const { data: tracesData, isLoading: isTracesLoading } = useGetQueryRange(
		{
			query: initialQueriesMap[DataSource.TRACES],
			graphType: PANEL_TYPES.TABLE,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: '30m',
			params: {
				dataSource: DataSource.TRACES,
			},
		},
		DEFAULT_ENTITY_VERSION,
		{
			queryKey: [
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				'30m',
				endTime || Date.now(),
				startTime || Date.now(),
				initialQueriesMap[DataSource.TRACES],
			],
			enabled: !!startTime && !!endTime,
		},
	);

	// Detect Infra Metrics - Hosts
	const query = useMemo(() => {
		const baseQuery = getHostListsQuery();

		let queryStartTime = startTime;
		let queryEndTime = endTime;

		if (!startTime || !endTime) {
			const now = new Date();
			const startTime = new Date(now.getTime() - homeInterval);
			const endTime = now;

			queryStartTime = startTime.getTime();
			queryEndTime = endTime.getTime();
		}

		return {
			...baseQuery,
			limit: 10,
			offset: 0,
			filters: {
				items: [],
				op: 'AND',
			},
			start: queryStartTime,
			end: queryEndTime,
		};
	}, [startTime, endTime]);

	const { data: hostData } = useGetHostList(query as HostListPayload, {
		queryKey: ['hostList', query],
		enabled: !!query,
	});

	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const { data: k8sPodsData } = useGetK8sPodsList(
		query as K8sPodsListPayload,
		{
			queryKey: ['K8sPodsList', query],
			enabled: !!query,
		},
		undefined,
		dotMetricsEnabled,
	);

	const [isLogsIngestionActive, setIsLogsIngestionActive] = useState(false);
	const [isTracesIngestionActive, setIsTracesIngestionActive] = useState(false);
	const [isMetricsIngestionActive, setIsMetricsIngestionActive] = useState(
		false,
	);

	const processUserPreferences = (userPreferences: UserPreference[]): void => {
		const checklistSkipped = Boolean(
			userPreferences?.find(
				(preference) =>
					preference.name === ORG_PREFERENCES.WELCOME_CHECKLIST_DO_LATER,
			)?.value,
		);

		const updatedChecklistItems = cloneDeep(checklistItems);

		const newChecklistItems = updatedChecklistItems.map((item) => {
			const newItem = { ...item };

			const isSkipped = Boolean(
				userPreferences?.find(
					(preference) => preference.name === item.skippedPreferenceKey,
				)?.value,
			);

			newItem.isSkipped = isSkipped || false;
			return newItem;
		});

		setChecklistItems(newChecklistItems);

		setIsWelcomeChecklistSkipped(checklistSkipped || false);
	};

	// Fetch User Preferences
	const { refetch: refetchUserPreferences } = useQuery({
		queryFn: () => listUserPreferences(),
		queryKey: ['getUserPreferences'],
		enabled: true,
		refetchOnWindowFocus: false,
		onSuccess: (response) => {
			if (response.data) {
				processUserPreferences(response.data);
			}

			setLoadingUserPreferences(false);
			setUpdatingUserPreferences(false);
		},
		onError: () => {
			setUpdatingUserPreferences(false);
			setLoadingUserPreferences(false);
		},
	});

	const { mutate: updateUserPreference } = useMutation(updateUserPreferenceAPI, {
		onSuccess: () => {
			setUpdatingUserPreferences(false);
			refetchUserPreferences();
		},
		onError: () => {
			setUpdatingUserPreferences(false);
		},
	});

	const handleWillDoThisLater = (): void => {
		logEvent('Welcome Checklist: Will do this later clicked', {});
		setUpdatingUserPreferences(true);

		updateUserPreference({
			name: ORG_PREFERENCES.WELCOME_CHECKLIST_DO_LATER,
			value: true,
		});
	};

	const handleSkipChecklistItem = (item: ChecklistItem): void => {
		if (item.skippedPreferenceKey) {
			setUpdatingUserPreferences(true);

			updateUserPreference({
				name: item.skippedPreferenceKey,
				value: true,
			});
		}
	};

	const renderWelcomeChecklistModal = (): JSX.Element => (
		<div className="welcome-checklist-popover-container">
			<HomeChecklist
				checklistItems={checklistItems}
				onSkip={handleSkipChecklistItem}
				isLoading={loadingUserPreferences || updatingUserPreferences}
			/>
		</div>
	);

	const handleUpdateChecklistDoneItem = useCallback((itemKey: string): void => {
		setChecklistItems((prevItems) =>
			prevItems.map((item) =>
				item.id === itemKey ? { ...item, completed: true } : item,
			),
		);
	}, []);

	useEffect(() => {
		const logsDataTotal = parseInt(
			logsData?.payload?.data?.newResult?.data?.result?.[0]?.series?.[0]
				?.values?.[0]?.value || '0',
			10,
		);

		if (logsDataTotal > 0) {
			setIsLogsIngestionActive(true);
			handleUpdateChecklistDoneItem('SEND_LOGS');
			handleUpdateChecklistDoneItem('ADD_DATA_SOURCE');
		}
	}, [logsData, handleUpdateChecklistDoneItem]);

	useEffect(() => {
		const tracesDataTotal = parseInt(
			tracesData?.payload?.data?.newResult?.data?.result?.[0]?.series?.[0]
				?.values?.[0]?.value || '0',
			10,
		);

		if (tracesDataTotal > 0) {
			setIsTracesIngestionActive(true);
			handleUpdateChecklistDoneItem('SEND_TRACES');
			handleUpdateChecklistDoneItem('ADD_DATA_SOURCE');
		}
	}, [tracesData, handleUpdateChecklistDoneItem]);

	useEffect(() => {
		const hostDataTotal = hostData?.payload?.data?.total ?? 0;
		const k8sPodsDataTotal = k8sPodsData?.payload?.data?.total ?? 0;

		if (hostDataTotal > 0 || k8sPodsDataTotal > 0) {
			setIsMetricsIngestionActive(true);
			handleUpdateChecklistDoneItem('ADD_DATA_SOURCE');
			handleUpdateChecklistDoneItem('SEND_INFRA_METRICS');
		}
	}, [hostData, k8sPodsData, handleUpdateChecklistDoneItem]);

	const { isCloudUser, isEnterpriseSelfHostedUser } = useGetTenantLicense();

	useEffect(() => {
		logEvent('Homepage: Visited', {});
	}, []);

	const hideBanner = (): void => {
		localStorage.setItem(LOCALSTORAGE.BANNER_DISMISSED, 'true');
		setIsBannerDismissed(true);
	};

	const showBanner = useMemo(
		() => !isBannerDismissed && (isCommunityUser || isCommunityEnterpriseUser),
		[isBannerDismissed, isCommunityUser, isCommunityEnterpriseUser],
	);

	return (
		<div className="home-container">
			<div className="sticky-header">
				{showBanner && (
					<div className="home-container-banner">
						<div className="home-container-banner-content">
							Big News: SigNoz Community Edition now available with SSO (Google OAuth)
							and API keys -
							<a
								href="https://signoz.io/blog/open-source-signoz-now-available-with-sso-and-api-keys/"
								target="_blank"
								rel="noreferrer"
								className="home-container-banner-link"
							>
								<i>read more</i>
							</a>
						</div>

						<div className="home-container-banner-close">
							<X size={16} onClick={hideBanner} />
						</div>
					</div>
				)}

				<Header
					leftComponent={
						<div className="home-header-left">
							<HomeIcon size={14} /> Home
						</div>
					}
					rightComponent={
						<div className="home-header-right">
							{isWelcomeChecklistSkipped && (
								<Popover
									placement="bottomRight"
									arrow={false}
									trigger="click"
									autoAdjustOverflow
									onOpenChange={(visible): void => {
										if (visible) {
											logEvent('Welcome Checklist: Expanded', {});
										} else {
											logEvent('Welcome Checklist: Minimized', {});
										}
									}}
									content={renderWelcomeChecklistModal()}
									getPopupContainer={popupContainer}
									rootClassName="welcome-checklist-popover"
								>
									<Button
										type="default"
										size="small"
										className="periscope-btn secondary welcome-checklist-btn"
									>
										<img
											src="/Icons/spinner-half-blue.svg"
											alt="spinner-half-blue"
											width={16}
											height={16}
											className="welcome-checklist-icon"
										/>
										&nbsp; Welcome checklist
									</Button>
								</Popover>
							)}
						</div>
					}
				/>
			</div>

			<div className="home-content">
				<div className="home-left-content">
					<DataSourceInfo
						dataSentToSigNoz={
							isLogsIngestionActive ||
							isTracesIngestionActive ||
							isMetricsIngestionActive
						}
						isLoading={isLogsLoading || isTracesLoading}
					/>

					<div className="divider">
						<img src="/Images/dotted-divider.svg" alt="divider" />
					</div>

					<div className="active-ingestions-container">
						{isLogsIngestionActive && (
							<Card className="active-ingestion-card" size="small">
								<Card.Content>
									<div className="active-ingestion-card-content-container">
										<div className="active-ingestion-card-content">
											<div className="active-ingestion-card-content-icon">
												<DotIcon size={16} color={Color.BG_FOREST_500} />
											</div>

											<div className="active-ingestion-card-content-description">
												Logs ingestion is active
											</div>
										</div>

										<div
											role="button"
											tabIndex={0}
											className="active-ingestion-card-actions"
											onClick={(): void => {
												// eslint-disable-next-line sonarjs/no-duplicate-string
												logEvent('Homepage: Ingestion Active Explore clicked', {
													source: 'Logs',
												});
												history.push(ROUTES.LOGS_EXPLORER);
											}}
											onKeyDown={(e): void => {
												if (e.key === 'Enter') {
													logEvent('Homepage: Ingestion Active Explore clicked', {
														source: 'Logs',
													});
													history.push(ROUTES.LOGS_EXPLORER);
												}
											}}
										>
											<CompassIcon size={12} />
											Explore Logs
										</div>
									</div>
								</Card.Content>
							</Card>
						)}

						{isTracesIngestionActive && (
							<Card className="active-ingestion-card" size="small">
								<Card.Content>
									<div className="active-ingestion-card-content-container">
										<div className="active-ingestion-card-content">
											<div className="active-ingestion-card-content-icon">
												<DotIcon size={16} color={Color.BG_FOREST_500} />
											</div>

											<div className="active-ingestion-card-content-description">
												Traces ingestion is active
											</div>
										</div>

										<div
											className="active-ingestion-card-actions"
											role="button"
											tabIndex={0}
											onClick={(): void => {
												logEvent('Homepage: Ingestion Active Explore clicked', {
													source: 'Traces',
												});
												history.push(ROUTES.TRACES_EXPLORER);
											}}
											onKeyDown={(e): void => {
												if (e.key === 'Enter') {
													logEvent('Homepage: Ingestion Active Explore clicked', {
														source: 'Traces',
													});
													history.push(ROUTES.TRACES_EXPLORER);
												}
											}}
										>
											<CompassIcon size={12} />
											Explore Traces
										</div>
									</div>
								</Card.Content>
							</Card>
						)}

						{isMetricsIngestionActive && (
							<Card className="active-ingestion-card" size="small">
								<Card.Content>
									<div className="active-ingestion-card-content-container">
										<div className="active-ingestion-card-content">
											<div className="active-ingestion-card-content-icon">
												<DotIcon size={16} color={Color.BG_FOREST_500} />
											</div>

											<div className="active-ingestion-card-content-description">
												Metrics ingestion is active
											</div>
										</div>

										<div
											className="active-ingestion-card-actions"
											role="button"
											tabIndex={0}
											onClick={(): void => {
												logEvent('Homepage: Ingestion Active Explore clicked', {
													source: 'Metrics',
												});
												history.push(ROUTES.INFRASTRUCTURE_MONITORING_HOSTS);
											}}
											onKeyDown={(e): void => {
												if (e.key === 'Enter') {
													logEvent('Homepage: Ingestion Active Explore clicked', {
														source: 'Metrics',
													});
													history.push(ROUTES.INFRASTRUCTURE_MONITORING_HOSTS);
												}
											}}
										>
											<CompassIcon size={12} />
											Explore Infra Metrics
										</div>
									</div>
								</Card.Content>
							</Card>
						)}
					</div>

					{user?.role !== USER_ROLES.VIEWER && (
						<div className="explorers-container">
							<Card className="explorer-card">
								<Card.Content>
									<div className="section-container">
										<div className="section-content">
											<div className="section-icon">
												<img
													src="/Icons/wrench.svg"
													alt="wrench"
													width={16}
													height={16}
													loading="lazy"
												/>
											</div>

											<div className="section-title">
												<div className="title">Filter and save views with the Explorer</div>

												<div className="description">
													Explore your data, and save useful views for everyone in the team.
												</div>
											</div>
										</div>

										<div className="section-actions">
											<Button
												type="default"
												className="periscope-btn secondary"
												icon={<Wrench size={14} />}
												onClick={(): void => {
													logEvent('Homepage: Explore clicked', {
														source: 'Logs',
													});
													history.push(ROUTES.LOGS_EXPLORER);
												}}
											>
												Open Logs Explorer
											</Button>

											<Button
												type="default"
												className="periscope-btn secondary"
												icon={<Wrench size={14} />}
												onClick={(): void => {
													logEvent('Homepage: Explore clicked', {
														source: 'Traces',
													});
													history.push(ROUTES.TRACES_EXPLORER);
												}}
											>
												Open Traces Explorer
											</Button>
										</div>
									</div>
								</Card.Content>
							</Card>

							<Card className="explorer-card">
								<Card.Content>
									<div className="section-container">
										<div className="section-content">
											<div className="section-icon">
												<img
													src="/Icons/dashboard.svg"
													alt="dashboard"
													width={16}
													height={16}
												/>
											</div>

											<div className="section-title">
												<div className="title">Create a dashboard</div>

												<div className="description">
													Create a dashboard to visualize your data.
												</div>
											</div>
										</div>

										<div className="section-actions">
											<Button
												type="default"
												className="periscope-btn secondary"
												icon={<Plus size={14} />}
												onClick={(): void => {
													logEvent('Homepage: Explore clicked', {
														source: 'Dashboards',
													});
													history.push(ROUTES.ALL_DASHBOARD);
												}}
											>
												Create dashboard
											</Button>
										</div>
									</div>
								</Card.Content>
							</Card>

							<Card className="explorer-card">
								<Card.Content>
									<div className="section-container">
										<div className="section-content">
											<div className="section-icon">
												<img
													src="/Icons/cracker.svg"
													alt="cracker"
													width={16}
													height={16}
													loading="lazy"
												/>
											</div>

											<div className="section-title">
												<div className="title">Add an alert</div>

												<div className="description">
													Create bespoke alerting rules to suit your needs.
												</div>
											</div>
										</div>

										<div className="section-actions">
											<Button
												type="default"
												className="periscope-btn secondary"
												icon={<Plus size={14} />}
												onClick={(): void => {
													logEvent('Homepage: Explore clicked', {
														source: 'Alerts',
													});
													history.push(ROUTES.ALERTS_NEW);
												}}
											>
												Create an alert
											</Button>
										</div>
									</div>
								</Card.Content>
							</Card>
						</div>
					)}

					{(isLogsIngestionActive ||
						isTracesIngestionActive ||
						isMetricsIngestionActive) && (
						<>
							<AlertRules
								onUpdateChecklistDoneItem={handleUpdateChecklistDoneItem}
								loadingUserPreferences={loadingUserPreferences}
							/>
							<Dashboards
								onUpdateChecklistDoneItem={handleUpdateChecklistDoneItem}
								loadingUserPreferences={loadingUserPreferences}
							/>
						</>
					)}
				</div>
				<div className="home-right-content">
					{(isCloudUser || isEnterpriseSelfHostedUser) && (
						<div className="home-notifications-container">
							<div className="notification">
								<Alert
									message={
										<>
											We&apos;re updating our metric ingestion processing pipeline.
											Currently, metric names and labels are normalized to replace dots and
											other special characters with underscores (_). This restriction will
											soon be removed. Learn more{' '}
											<a
												href="https://signoz.io/guides/metrics-migration-cloud-users"
												target="_blank"
												rel="noopener noreferrer"
											>
												here
											</a>
											.
										</>
									}
									type="warning"
									showIcon
								/>
							</div>
						</div>
					)}

					{!isWelcomeChecklistSkipped && !loadingUserPreferences && (
						<AnimatePresence initial={false}>
							<Card className="checklist-card">
								<Card.Content>
									<motion.div
										initial={{ opacity: 0, scale: 0 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0 }}
										key="box"
									>
										<div className="checklist-container">
											<div className="checklist-items-container">
												<StepsProgress checklistItems={checklistItems} />

												<HomeChecklist
													checklistItems={checklistItems}
													onSkip={handleSkipChecklistItem}
													isLoading={updatingUserPreferences || loadingUserPreferences}
												/>
											</div>
											<div className="checklist-container-right-img">
												<div className="checklist-img-bg-container">
													<img
														src="/Images/perilianBackground.svg"
														alt="not-found"
														className="checklist-img-bg"
													/>
												</div>

												<div className="checklist-img-container">
													<img
														src="/Images/allInOne.svg"
														alt="checklist-img"
														className="checklist-img"
													/>
												</div>
											</div>
										</div>
									</motion.div>
								</Card.Content>

								<Card.Footer>
									<div className="checklist-footer-container">
										<Button
											type="link"
											onClick={handleWillDoThisLater}
											loading={updatingUserPreferences}
										>
											I&apos;ll do this later
										</Button>
									</div>
								</Card.Footer>
							</Card>
						</AnimatePresence>
					)}

					{(isLogsIngestionActive ||
						isTracesIngestionActive ||
						isMetricsIngestionActive) && (
						<>
							<Services
								onUpdateChecklistDoneItem={handleUpdateChecklistDoneItem}
								loadingUserPreferences={loadingUserPreferences}
							/>
							<SavedViews
								onUpdateChecklistDoneItem={handleUpdateChecklistDoneItem}
								loadingUserPreferences={loadingUserPreferences}
							/>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
