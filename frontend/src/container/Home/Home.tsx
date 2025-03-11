import './Home.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Popover } from 'antd';
import { HostListPayload } from 'api/infraMonitoring/getHostLists';
import getAllUserPreferences from 'api/preferences/getAllUserPreference';
import updateUserPreferenceAPI from 'api/preferences/updateUserPreference';
import Header from 'components/Header/Header';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import { getHostListsQuery } from 'container/InfraMonitoringHosts/utils';
import { useGetHostList } from 'hooks/infraMonitoring/useGetHostList';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import history from 'lib/history';
import cloneDeep from 'lodash-es/cloneDeep';
import { CompassIcon, DotIcon, HomeIcon, Plus, Wrench } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import * as motion from 'motion/react-client';
import Card from 'periscope/components/Card/Card';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { DataSource } from 'types/common/queryBuilder';
import { UserPreference } from 'types/reducer/app';
import { GlobalReducer } from 'types/reducer/globalTime';
import { popupContainer } from 'utils/selectPopupContainer';

import AlertRules from './AlertRules/AlertRules';
import Dashboards from './Dashboards/Dashboards';
import DataSourceInfo from './DataSourceInfo/DataSourceInfo';
import HomeChecklist, { ChecklistItem } from './HomeChecklist/HomeChecklist';
import SavedViews from './SavedViews/SavedViews';
import Services from './Services/Services';
import StepsProgress from './StepsProgress/StepsProgress';

const checkListStepToPreferenceKeyMap = {
	WILL_DO_LATER: 'WELCOME_CHECKLIST_DO_LATER',
	SEND_LOGS: 'WELCOME_CHECKLIST_SEND_LOGS_SKIPPED',
	SEND_TRACES: 'WELCOME_CHECKLIST_SEND_TRACES_SKIPPED',
	SEND_INFRA_METRICS: 'WELCOME_CHECKLIST_SEND_INFRA_METRICS_SKIPPED',
	SETUP_DASHBOARDS: 'WELCOME_CHECKLIST_SETUP_DASHBOARDS_SKIPPED',
	SETUP_ALERTS: 'WELCOME_CHECKLIST_SETUP_ALERTS_SKIPPED',
	SETUP_SAVED_VIEWS: 'WELCOME_CHECKLIST_SETUP_SAVED_VIEW_SKIPPED',
	SETUP_WORKSPACE: 'WELCOME_CHECKLIST_SETUP_WORKSPACE_SKIPPED',
	ADD_DATA_SOURCE: 'WELCOME_CHECKLIST_ADD_DATA_SOURCE_SKIPPED',
};

const DOCS_LINKS = {
	SEND_LOGS: 'https://signoz.io/docs/userguide/logs/',
	SEND_TRACES: 'https://signoz.io/docs/userguide/traces/',
	SEND_INFRA_METRICS:
		'https://signoz.io/docs/infrastructure-monitoring/overview/',
	SETUP_ALERTS: 'https://signoz.io/docs/userguide/alerts-management/',
	SETUP_SAVED_VIEWS:
		'https://signoz.io/docs/product-features/saved-view/#step-2-save-your-view',
	SETUP_DASHBOARDS: 'https://signoz.io/docs/userguide/manage-dashboards/',
};

const defaultChecklistItemsState: ChecklistItem[] = [
	{
		id: 'SETUP_WORKSPACE',
		title: 'Set up your workspace',
		description: '',
		completed: true,
		isSkipped: false,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.SETUP_WORKSPACE,
	},
	{
		id: 'ADD_DATA_SOURCE',
		title: 'Add your first data source',
		description: '',
		completed: false,
		isSkipped: false,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.ADD_DATA_SOURCE,
		toRoute: ROUTES.GET_STARTED,
	},
	{
		id: 'SEND_LOGS',
		title: 'Send your logs',
		description:
			'Send your logs to SigNoz to get more visibility into how your resources interact.',
		completed: false,
		isSkipped: false,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.SEND_LOGS,
		toRoute: ROUTES.GET_STARTED,
		docsLink: DOCS_LINKS.SEND_LOGS,
	},
	{
		id: 'SEND_TRACES',
		title: 'Send your traces',
		description:
			'Send your traces to SigNoz to get more visibility into how your resources interact.',
		completed: false,
		isSkipped: false,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.SEND_TRACES,
		toRoute: ROUTES.GET_STARTED,
		docsLink: DOCS_LINKS.SEND_TRACES,
	},
	{
		id: 'SEND_INFRA_METRICS',
		title: 'Send your infra metrics',
		description:
			'Send your infra metrics to SigNoz to get more visibility into your infrastructure.',
		completed: false,
		isSkipped: false,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.SEND_INFRA_METRICS,
		toRoute: ROUTES.GET_STARTED,
		docsLink: DOCS_LINKS.SEND_INFRA_METRICS,
	},
	{
		id: 'SETUP_ALERTS',
		title: 'Setup Alerts',
		description:
			'Setup alerts to get notified when your resources are not performing as expected.',
		completed: false,
		isSkipped: false,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.SETUP_ALERTS,
		toRoute: ROUTES.ALERTS_NEW,
		docsLink: DOCS_LINKS.SETUP_ALERTS,
	},
	{
		id: 'SETUP_SAVED_VIEWS',
		title: 'Setup Saved Views',
		description:
			'Save your views to get a quick overview of your data and share it with your team.',
		completed: false,
		isSkipped: false,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.SETUP_SAVED_VIEWS,
		toRoute: ROUTES.LOGS_EXPLORER,
		docsLink: DOCS_LINKS.SETUP_SAVED_VIEWS,
	},
	{
		id: 'SETUP_DASHBOARDS',
		title: 'Setup Dashboards',
		description:
			'Create dashboards to visualize your data and share it with your team.',
		completed: false,
		isSkipped: false,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.SETUP_DASHBOARDS,
		toRoute: ROUTES.ALL_DASHBOARD,
		docsLink: DOCS_LINKS.SETUP_DASHBOARDS,
	},
];

export default function Home(): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const [updatingUserPreferences, setUpdatingUserPreferences] = useState(false);
	const [loadingUserPreferences, setLoadingUserPreferences] = useState(true);

	const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(
		defaultChecklistItemsState,
	);

	const [isWelcomeChecklistSkipped, setIsWelcomeChecklistSkipped] = useState(
		false,
	);

	const isMetricIngestionActive = false;

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
				maxTime / 1000,
				minTime / 1000,
				initialQueriesMap[DataSource.LOGS],
			],
			enabled: true,
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
				maxTime / 1000,
				minTime / 1000,
				initialQueriesMap[DataSource.TRACES],
			],
			enabled: true,
		},
	);

	console.log('logsData', logsData);
	console.log('tracesData', tracesData);

	// Detect Infra Metrics - Hosts
	const query = useMemo(() => {
		const baseQuery = getHostListsQuery();
		return {
			...baseQuery,
			limit: 10,
			offset: 0,
			filters: {
				items: [],
				op: 'and',
			},
			start: Math.floor(minTime / 1000000),
			end: Math.floor(maxTime / 1000000),
			orderBy: {
				columnName: 'hostName',
				order: 'asc',
			},
			groupBy: [],
		};
	}, [minTime, maxTime]);

	const { data, isFetching, isLoading, isError } = useGetHostList(
		query as HostListPayload,
		{
			queryKey: ['hostList', query],
			enabled: !!query,
		},
	);

	console.log('data', data, isFetching, isLoading, isError);

	const [isLogsIngestionActive, setIsLogsIngestionActive] = useState(false);
	const [isTracesIngestionActive, setIsTracesIngestionActive] = useState(false);

	const processUserPreferences = (userPreferences: UserPreference[]): void => {
		const checklistSkipped = userPreferences?.find(
			(preference) => preference.key === 'WELCOME_CHECKLIST_DO_LATER',
		)?.value;

		const updatedChecklistItems = cloneDeep(checklistItems);

		const newChecklistItems = updatedChecklistItems.map((item) => {
			const newItem = { ...item };
			newItem.isSkipped =
				userPreferences?.find(
					(preference) => preference.key === item.skippedPreferenceKey,
				)?.value || false;
			return newItem;
		});

		setChecklistItems(newChecklistItems);

		console.log('checklistSkipped', checklistSkipped);

		setIsWelcomeChecklistSkipped(checklistSkipped || false);
	};

	// Fetch User Preferences
	const { refetch: refetchUserPreferences } = useQuery({
		queryFn: () => getAllUserPreferences(),
		queryKey: ['getUserPreferences'],
		enabled: true,
		refetchOnWindowFocus: false,
		onSuccess: (response) => {
			if (response.payload && response.payload.data) {
				processUserPreferences(response.payload.data);
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
		setUpdatingUserPreferences(true);

		updateUserPreference({
			preferenceID: 'WELCOME_CHECKLIST_DO_LATER',
			value: true,
		});
	};

	const handleSkipChecklistItem = (item: ChecklistItem): void => {
		if (item.skippedPreferenceKey) {
			setUpdatingUserPreferences(true);

			updateUserPreference({
				preferenceID: item.skippedPreferenceKey,
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
		if (logsData && logsData?.payload.data.result.length > 0) {
			setIsLogsIngestionActive(true);
			handleUpdateChecklistDoneItem('SEND_LOGS');
		}
	}, [logsData, handleUpdateChecklistDoneItem]);

	useEffect(() => {
		if (tracesData && tracesData?.payload.data.result.length > 0) {
			setIsTracesIngestionActive(true);
			handleUpdateChecklistDoneItem('SEND_TRACES');
		}
	}, [tracesData, handleUpdateChecklistDoneItem]);

	return (
		<div className="home-container">
			<div className="sticky-header">
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
						dataSentToSigNoz={isLogsIngestionActive || isTracesIngestionActive}
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
												Log ingestion is active
											</div>
										</div>

										<div
											role="button"
											tabIndex={0}
											className="active-ingestion-card-actions"
											onClick={(): void => {
												history.push(ROUTES.LOGS_EXPLORER);
											}}
											onKeyDown={(e): void => {
												if (e.key === 'Enter') {
													history.push(ROUTES.LOGS_EXPLORER);
												}
											}}
										>
											<CompassIcon size={12} />
											Open Explorer
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
												Trace ingestion is active
											</div>
										</div>

										<div
											className="active-ingestion-card-actions"
											role="button"
											tabIndex={0}
											onClick={(): void => {
												history.push(ROUTES.TRACES_EXPLORER);
											}}
											onKeyDown={(e): void => {
												if (e.key === 'Enter') {
													history.push(ROUTES.TRACES_EXPLORER);
												}
											}}
										>
											<CompassIcon size={12} />
											Open Explorer
										</div>
									</div>
								</Card.Content>
							</Card>
						)}

						{isMetricIngestionActive && (
							<Card className="active-ingestion-card" size="small">
								<Card.Content>
									<div className="active-ingestion-card-content-container">
										<div className="active-ingestion-card-content">
											<div className="active-ingestion-card-content-icon">
												<DotIcon size={16} color={Color.BG_FOREST_500} />
											</div>

											<div className="active-ingestion-card-content-description">
												Metric ingestion is active
											</div>
										</div>

										<div
											className="active-ingestion-card-actions"
											role="button"
											tabIndex={0}
											onClick={(): void => {
												history.push(ROUTES.ALL_DASHBOARD);
											}}
											onKeyDown={(e): void => {
												if (e.key === 'Enter') {
													history.push(ROUTES.ALL_DASHBOARD);
												}
											}}
										>
											<CompassIcon size={12} />
											Open Dashboards
										</div>
									</div>
								</Card.Content>
							</Card>
						)}
					</div>

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
												history.push(ROUTES.LOGS_EXPLORER);
											}}
										>
											Open Explorer
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

					<AlertRules
						onUpdateChecklistDoneItem={handleUpdateChecklistDoneItem}
						loadingUserPreferences={loadingUserPreferences}
					/>
					<Dashboards
						onUpdateChecklistDoneItem={handleUpdateChecklistDoneItem}
						loadingUserPreferences={loadingUserPreferences}
					/>
				</div>

				<div className="home-right-content">
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

					<Services
						onUpdateChecklistDoneItem={handleUpdateChecklistDoneItem}
						loadingUserPreferences={loadingUserPreferences}
					/>
					<SavedViews
						onUpdateChecklistDoneItem={handleUpdateChecklistDoneItem}
						loadingUserPreferences={loadingUserPreferences}
					/>
				</div>
			</div>
		</div>
	);
}
