import './Home.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Typography } from 'antd';
import Header from 'components/Header/Header';
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

import AlertRules from './AlertRules/AlertRules';
import Dashboards from './Dashboards/Dashboards';
import SavedViews from './SavedViews/SavedViews';
import Traces from './Traces/Traces';

export default function Home(): JSX.Element {
	const workspaceDetails = {
		region: 'United States',
		url: 'https://signoz.io',
		timezone: 'America/New_York',
	};

	const notSendingData = false;
	const listeningToData = true;

	const isLogIngestionActive = true;
	const isTraceIngestionActive = true;
	const isMetricIngestionActive = true;

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
					rightComponent={null}
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
						<div className="checklist-container">
							<div className="checklist-title">Checklist</div>
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
					</Card>

					<Traces />
					<SavedViews />
				</div>
			</div>
		</div>
	);
}
