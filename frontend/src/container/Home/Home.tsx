import './Home.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Popover } from 'antd';
import getAll from 'api/alerts/getAll';
import Header from 'components/Header/Header';
import { FeatureKeys } from 'constants/features';
import ROUTES from 'constants/routes';
import { useGetAllDashboard } from 'hooks/dashboard/useGetAllDashboard';
import { useGetAllViews } from 'hooks/saveViews/useGetAllViews';
import history from 'lib/history';
import { CompassIcon, DotIcon, HomeIcon, Plus, Wrench } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import * as motion from 'motion/react-client';
import Card from 'periscope/components/Card/Card';
import { useAppContext } from 'providers/App/App';
import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { DataSource } from 'types/common/queryBuilder';
import { popupContainer } from 'utils/selectPopupContainer';

import AlertRules from './AlertRules/AlertRules';
import Dashboards from './Dashboards/Dashboards';
import DataSourceInfo from './DataSourceInfo/DataSourceInfo';
import HomeChecklist, { ChecklistItem } from './HomeChecklist/HomeChecklist';
import SavedViews from './SavedViews/SavedViews';
import Services from './Services/Services';
import StepsProgress from './StepsProgress/StepsProgress';

export default function Home(): JSX.Element {
	const checklistItems: ChecklistItem[] = [
		{
			id: '1',
			title: 'Set up your workspace',
			description: '',
			completed: true,
			isSkipped: false,
		},
		{
			id: '2',
			title: 'Add your first data source',
			description: '',
			completed: true,
			isSkipped: false,
		},
		{
			id: '3',
			title: 'Send your logs',
			description:
				'Send your logs to SigNoz to get more visibility into how your resources interact.',
			completed: false,
			isSkipped: false,
		},
		{
			id: '4',
			title: 'Send your traces',
			description:
				'Send your traces to SigNoz to get more visibility into how your resources interact.',
			completed: false,
			isSkipped: true,
		},
		{
			id: '5',
			title: 'Send your infra metrics',
			description:
				'Send your infra metrics to SigNoz to get more visibility into your infrastructure.',
			completed: true,
			isSkipped: false,
		},
		{
			id: '6',
			title: 'Setup Alerts',
			description:
				'Setup alerts to get notified when your resources are not performing as expected.',
			completed: true,
			isSkipped: false,
		},
		{
			id: '7',
			title: 'Setup Saved Views',
			description:
				'Save your views to get a quick overview of your data and share it with your team.',
			completed: false,
			isSkipped: false,
		},
		{
			id: '8',
			title: 'Setup Dashboards',
			description:
				'Create dashboards to visualize your data and share it with your team.',
			completed: false,
			isSkipped: false,
		},
	];

	const isLogIngestionActive = true;
	const isTraceIngestionActive = true;
	const isMetricIngestionActive = true;

	const [checklistSkipped, setChecklistSkipped] = useState<boolean>(false);

	const { featureFlags } = useAppContext();

	const isSpanMetricEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.USE_SPAN_METRICS)
			?.active || false;

	console.log('isSpanMetricEnabled', isSpanMetricEnabled);

	const renderWelcomeChecklistModal = (): JSX.Element => (
		<div className="welcome-checklist-popover-container">
			<HomeChecklist checklistItems={checklistItems} />
		</div>
	);

	// Fetch Dashboards
	const {
		data: dashboardsList,
		isLoading: isDashboardListLoading,
		isError: isDashboardListError,
		isFetching: isDashboardListFetching,
	} = useGetAllDashboard();

	// Fetch Alerts
	const {
		data: alerts,
		isError: alertsIsError,
		isLoading: alertsIsLoading,
		isFetching: alertsIsFetching,
	} = useQuery('allAlerts', {
		queryFn: getAll,
		cacheTime: 0,
	});

	const {
		data: logsViewsData,
		isLoading: logsViewsLoading,
		isFetching: logsViewsFetching,
		isError: logsViewsError,
	} = useGetAllViews(DataSource.LOGS);

	const {
		data: tracesViewsData,
		isLoading: tracesViewsLoading,
		isFetching: tracesViewsFetching,
		isError: tracesViewsError,
	} = useGetAllViews(DataSource.TRACES);

	const logsViews = useMemo(() => [...(logsViewsData?.data.data || [])], [
		logsViewsData,
	]);

	const tracesViews = useMemo(() => [...(tracesViewsData?.data.data || [])], [
		tracesViewsData,
	]);

	const handleWillDoThisLater = (): void => {
		setChecklistSkipped(true);
	};

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
						</div>
					}
				/>
			</div>

			<div className="home-content">
				<div className="home-left-content">
					<DataSourceInfo />

					<div className="divider">
						<img src="/Images/dotted-divider.svg" alt="divider" />
					</div>

					<div className="active-ingestions-container">
						{isLogIngestionActive && (
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

						{isTraceIngestionActive && (
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
						rules={alerts?.payload || []}
						isLoading={alertsIsLoading || alertsIsFetching}
						isError={alertsIsError}
					/>
					<Dashboards
						dashboards={dashboardsList || []}
						isLoading={isDashboardListLoading || isDashboardListFetching}
						isError={isDashboardListError}
					/>
				</div>

				<div className="home-right-content">
					<AnimatePresence initial={false}>
						{!checklistSkipped && (
							<motion.div
								initial={{ height: 'auto' }}
								animate={{ height: 'auto' }}
								exit={{ height: 0 }}
								key="box"
							>
								<Card className="checklist-card">
									<Card.Content>
										<div className="checklist-container">
											<div className="checklist-items-container">
												<StepsProgress checklistItems={checklistItems} />

												<HomeChecklist checklistItems={checklistItems} />
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
									</Card.Content>

									<Card.Footer>
										<div className="checklist-footer-container">
											<Button type="link" onClick={handleWillDoThisLater}>
												I’ll do this later
											</Button>
										</div>
									</Card.Footer>
								</Card>
							</motion.div>
						)}
					</AnimatePresence>

					<Services />
					<SavedViews
						tracesViews={tracesViews || []}
						logsViews={logsViews || []}
						logsViewsLoading={logsViewsLoading || logsViewsFetching}
						tracesViewsLoading={tracesViewsLoading || tracesViewsFetching}
						logsViewsError={logsViewsError}
						tracesViewsError={tracesViewsError}
					/>
				</div>
			</div>
		</div>
	);
}
