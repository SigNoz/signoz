import './Home.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Popover } from 'antd';
import getAllUserPreferences from 'api/preferences/getAllUserPreference';
import updateUserPreferenceAPI from 'api/preferences/updateUserPreference';
import Header from 'components/Header/Header';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import cloneDeep from 'lodash-es/cloneDeep';
import { CompassIcon, DotIcon, HomeIcon, Plus, Wrench } from 'lucide-react';
import Card from 'periscope/components/Card/Card';
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import { UserPreference } from 'types/reducer/app';
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
	SETUP_SAVED_VIEW: 'WELCOME_CHECKLIST_SETUP_SAVED_VIEW_SKIPPED',
	SETUP_WORKSPACE: 'WELCOME_CHECKLIST_SETUP_WORKSPACE_SKIPPED',
	ADD_DATA_SOURCE: 'WELCOME_CHECKLIST_ADD_DATA_SOURCE_SKIPPED',
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
	},
	{
		id: 'SEND_LOGS',
		title: 'Send your logs',
		description:
			'Send your logs to SigNoz to get more visibility into how your resources interact.',
		completed: false,
		isSkipped: false,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.SEND_LOGS,
	},
	{
		id: 'SEND_TRACES',
		title: 'Send your traces',
		description:
			'Send your traces to SigNoz to get more visibility into how your resources interact.',
		completed: false,
		isSkipped: false,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.SEND_TRACES,
	},
	{
		id: 'SEND_INFRA_METRICS',
		title: 'Send your infra metrics',
		description:
			'Send your infra metrics to SigNoz to get more visibility into your infrastructure.',
		completed: false,
		isSkipped: false,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.SEND_INFRA_METRICS,
	},
	{
		id: 'SETUP_ALERTS',
		title: 'Setup Alerts',
		description:
			'Setup alerts to get notified when your resources are not performing as expected.',
		completed: false,
		isSkipped: false,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.SETUP_ALERTS,
	},
	{
		id: 'SETUP_SAVED_VIEW',
		title: 'Setup Saved Views',
		description:
			'Save your views to get a quick overview of your data and share it with your team.',
		completed: false,
		isSkipped: false,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.SETUP_SAVED_VIEW,
	},
	{
		id: 'SETUP_DASHBOARDS',
		title: 'Setup Dashboards',
		description:
			'Create dashboards to visualize your data and share it with your team.',
		completed: false,
		isSkipped: false,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.SETUP_DASHBOARDS,
	},
];

export default function Home(): JSX.Element {
	const [userPreferences, setUserPreferences] = useState<UserPreference[]>([]);
	const [updatingUserPreferences, setUpdatingUserPreferences] = useState(false);
	const [loadingUserPreferences, setLoadingUserPreferences] = useState(true);

	const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(
		defaultChecklistItemsState,
	);

	const [isWelcomeChecklistSkipped, setIsWelcomeChecklistSkipped] = useState(
		false,
	);

	const isLogIngestionActive = true;
	const isTraceIngestionActive = true;
	const isMetricIngestionActive = true;

	// Fetch User Preferences
	const { refetch: refetchUserPreferences } = useQuery({
		queryFn: () => getAllUserPreferences(),
		queryKey: ['getUserPreferences'],
		enabled: true,
		refetchOnWindowFocus: false,
		onSuccess: (response) => {
			if (response.payload && response.payload.data) {
				setUserPreferences(response.payload.data);
			}

			setLoadingUserPreferences(false);
			setUpdatingUserPreferences(false);
		},
		onError: () => {
			setUpdatingUserPreferences(false);
			setLoadingUserPreferences(false);
		},
	});

	useEffect(() => {
		const checklistSkipped = userPreferences?.find(
			(preference) => preference.key === 'WELCOME_CHECKLIST_DO_LATER',
		)?.value;

		const updatedChecklistItems = cloneDeep(defaultChecklistItemsState);

		const newChecklistItems = updatedChecklistItems.map((item) => {
			const newItem = { ...item };
			newItem.isSkipped =
				userPreferences?.find(
					(preference) => preference.key === item.skippedPreferenceKey,
				)?.value || false;
			return newItem;
		});

		setChecklistItems(newChecklistItems);

		setIsWelcomeChecklistSkipped(checklistSkipped || false);
	}, [userPreferences]);

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

					<AlertRules />
					<Dashboards />
				</div>

				<div className="home-right-content">
					{isWelcomeChecklistSkipped && !loadingUserPreferences && (
						<Card className="checklist-card">
							<Card.Content>
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
							</Card.Content>

							<Card.Footer>
								<div className="checklist-footer-container">
									<Button
										type="link"
										onClick={handleWillDoThisLater}
										loading={updatingUserPreferences}
									>
										I’ll do this later
									</Button>
								</div>
							</Card.Footer>
						</Card>
					)}

					<Services />
					<SavedViews />
				</div>
			</div>
		</div>
	);
}
