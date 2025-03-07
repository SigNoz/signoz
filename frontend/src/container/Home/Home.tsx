import './Home.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Popover, Typography } from 'antd';
import getAll from 'api/alerts/getAll';
import Header from 'components/Header/Header';
import { useGetAllDashboard } from 'hooks/dashboard/useGetAllDashboard';
import { useGetAllViews } from 'hooks/saveViews/useGetAllViews';
import { useQueryService } from 'hooks/useQueryService';
import {
	Clock,
	CompassIcon,
	DotIcon,
	Globe,
	HomeIcon,
	Link2,
	Plus,
	Wrench,
} from 'lucide-react';
import Card from 'periscope/components/Card/Card';
import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import { popupContainer } from 'utils/selectPopupContainer';

import AlertRules from './AlertRules/AlertRules';
import Dashboards from './Dashboards/Dashboards';
import HomeChecklist, { ChecklistItem } from './HomeChecklist/HomeChecklist';
import SavedViews from './SavedViews/SavedViews';
import Traces from './Services/Services';
import StepsProgress from './StepsProgress/StepsProgress';

export default function Home(): JSX.Element {
	const { maxTime, minTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

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

	const workspaceDetails = {
		region: 'United States',
		url: 'https://signoz.io',
		timezone: 'America/New_York',
	};

	const notSendingData = true;
	const listeningToData = false;

	const isLogIngestionActive = true;
	const isTraceIngestionActive = true;
	const isMetricIngestionActive = true;

	const renderWelcomeChecklistModal = (): JSX.Element => (
		<div className="welcome-checklist-popover-container">
			<HomeChecklist checklistItems={checklistItems} />
		</div>
	);

	// Fetch Services
	const { data: services, error, isLoading, isError } = useQueryService({
		minTime,
		maxTime,
		selectedTime,
		selectedTags: [],
	});

	console.log(
		'services',
		services,
		error,
		isLoading,
		isError,
		selectedTime,
		minTime,
		maxTime,
	);

	// Fetch Dashboards
	const {
		data: dashboardsList,
		isLoading: isDashboardListLoading,
		isRefetching: isDashboardListRefetching,
		error: dashboardFetchError,
	} = useGetAllDashboard();

	console.log(
		'dashboardsList',
		dashboardsList,
		isDashboardListLoading,
		isDashboardListRefetching,
		dashboardFetchError,
	);

	// Fetch Alerts

	const {
		data: alerts,
		isError: alertsIsError,
		isLoading: alertsIsLoading,
		status: alertsStatus,
	} = useQuery('allAlerts', {
		queryFn: getAll,
		cacheTime: 0,
	});

	console.log(
		'alerts',
		alerts?.payload,
		alertsIsError,
		alertsIsLoading,
		alertsStatus,
	);

	const {
		data: logsViewsData,
		isLoading: logsViewsLoading,
		error: logsViewsError,
		isRefetching: logsViewsRefetching,
	} = useGetAllViews(DataSource.LOGS);

	console.log(
		'logsViewsData',
		logsViewsData,
		logsViewsLoading,
		logsViewsError,
		logsViewsRefetching,
	);

	const {
		data: tracesViewsData,
		isLoading: tracesViewsLoading,
		error: tracesViewsError,
		isRefetching: tracesViewsRefetching,
	} = useGetAllViews(DataSource.TRACES);

	console.log(
		'tracesViewsData',
		tracesViewsData,
		tracesViewsLoading,
		tracesViewsError,
		tracesViewsRefetching,
	);

	const logsViews = useMemo(() => [...(logsViewsData?.data.data || [])], [
		logsViewsData,
	]);

	const tracesViews = useMemo(() => [...(tracesViewsData?.data.data || [])], [
		tracesViewsData,
	]);

	console.log('logsViews', logsViews);
	console.log('tracesViews', tracesViews);

	const renderNotSendingData = (): JSX.Element => (
		<>
			<Typography className="welcome-title">
				Hello there, Welcome to your SigNoz workspace
			</Typography>

			<Typography className="welcome-description">
				You’re not sending any data yet. <br />
				SigNoz is so much better with your data ⎯ start by sending your telemetry
				data to SigNoz.
			</Typography>

			<Card className="welcome-card">
				<Card.Content>
					<div className="workspace-ready-container">
						<div className="workspace-ready-header">
							<Typography className="workspace-ready-title">
								<img src="/Icons/hurray.svg" alt="hurray" />
								Your workspace is ready
							</Typography>

							<Button
								type="primary"
								className="periscope-btn primary"
								icon={<img src="/Icons/container-plus.svg" alt="plus" />}
							>
								Connect Data Source
							</Button>
						</div>

						<div className="workspace-details">
							<div className="workspace-region">
								<Globe size={10} />
								<Typography>{workspaceDetails.region}</Typography>
							</div>

							<div className="workspace-url">
								<Link2 size={12} />
								<Typography>{workspaceDetails.url}</Typography>
							</div>

							<div className="workspace-timezone">
								<Clock size={10} />
								<Typography>{workspaceDetails.timezone}</Typography>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card>
		</>
	);

	const renderListeningToData = (): JSX.Element => (
		<>
			<Typography className="welcome-title">Listening for data</Typography>

			<Typography className="welcome-description">
				Hold on a bit, it takes a little time for the data to start streaming in.
			</Typography>

			<Card className="welcome-card">
				<Card.Content>
					<div className="workspace-ready-container">
						<div className="workspace-ready-header">
							<Typography className="workspace-ready-title">
								<img src="/Icons/spinner.svg" alt="spinner" />
								Waiting for logs...
							</Typography>

							<Button
								type="default"
								className="periscope-btn secondary"
								icon={<img src="/Icons/play-back.svg" alt="play-back" />}
							>
								Retry sending data
							</Button>
						</div>

						<div className="workspace-details">
							<div className="workspace-region">
								<Globe size={10} />
								<Typography>{workspaceDetails.region}</Typography>
							</div>

							<div className="workspace-url">
								<Link2 size={12} />
								<Typography>{workspaceDetails.url}</Typography>
							</div>

							<div className="workspace-timezone">
								<Clock size={12} />
								<Typography>{workspaceDetails.timezone}</Typography>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card>
		</>
	);

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
				<div className="left-content">
					<div className="welcome-container">
						<div className="hello-wave-container">
							<div className="hello-wave-img-container">
								<img
									src="/Icons/hello-wave.svg"
									alt="hello-wave"
									className="hello-wave-img"
									width={36}
									height={36}
								/>
							</div>
						</div>

						{notSendingData && renderNotSendingData()}

						{listeningToData && renderListeningToData()}
					</div>

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

										<div className="active-ingestion-card-actions">
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

										<div className="active-ingestion-card-actions">
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

										<div className="active-ingestion-card-actions">
											<CompassIcon size={12} />
											Open Explorer
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
										>
											Create an alert
										</Button>
									</div>
								</div>
							</Card.Content>
						</Card>
					</div>

					<AlertRules />
					<Dashboards />
				</div>

				<div className="right-content">
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
								<Button type="link">I’ll do this later</Button>
							</div>
						</Card.Footer>
					</Card>

					<Traces />
					<SavedViews />
				</div>
			</div>
		</div>
	);
}
