import { Button, Skeleton, Tag } from 'antd';
import logEvent from 'api/common/logEvent';
import { getViewDetailsUsingViewKey } from 'components/ExplorerCard/utils';
import ROUTES from 'constants/routes';
import { useGetAllViews } from 'hooks/saveViews/useGetAllViews';
import { useHandleExplorerTabChange } from 'hooks/useHandleExplorerTabChange';
import {
	ArrowRight,
	ArrowUpRight,
	BarChart,
	CompassIcon,
	DraftingCompass,
} from 'lucide-react';
import { SOURCEPAGE_VS_ROUTES } from 'pages/SaveView/constants';
import Card from 'periscope/components/Card/Card';
import { useAppContext } from 'providers/App/App';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ViewProps } from 'types/api/saveViews/types';
import { DataSource } from 'types/common/queryBuilder';
import { USER_ROLES } from 'types/roles';

export default function SavedViews({
	onUpdateChecklistDoneItem,
	loadingUserPreferences,
}: {
	onUpdateChecklistDoneItem: (itemKey: string) => void;
	loadingUserPreferences: boolean;
}): JSX.Element {
	const { user } = useAppContext();
	const [selectedEntity, setSelectedEntity] = useState<string>('logs');
	const [selectedEntityViews, setSelectedEntityViews] = useState<any[]>([]);

	const {
		data: logsViewsData,
		isLoading: logsViewsLoading,
		isError: logsViewsError,
	} = useGetAllViews(DataSource.LOGS);

	const {
		data: tracesViewsData,
		isLoading: tracesViewsLoading,
		isError: tracesViewsError,
	} = useGetAllViews(DataSource.TRACES);

	const {
		data: metricsViewsData,
		isLoading: metricsViewsLoading,
		isError: metricsViewsError,
	} = useGetAllViews(DataSource.METRICS);

	const logsViews = useMemo(() => [...(logsViewsData?.data.data || [])], [
		logsViewsData,
	]);

	const tracesViews = useMemo(() => [...(tracesViewsData?.data.data || [])], [
		tracesViewsData,
	]);

	const metricsViews = useMemo(() => [...(metricsViewsData?.data.data || [])], [
		metricsViewsData,
	]);

	useEffect(() => {
		if (selectedEntity === 'logs') {
			setSelectedEntityViews(logsViews);
		} else if (selectedEntity === 'traces') {
			setSelectedEntityViews(tracesViews);
		} else if (selectedEntity === 'metrics') {
			setSelectedEntityViews(metricsViews);
		}
	}, [selectedEntity, logsViews, tracesViews, metricsViews]);

	const hasTracesViews = tracesViews.length > 0;
	const hasLogsViews = logsViews.length > 0;
	const hasMetricsViews = metricsViews.length > 0;

	const hasSavedViews = hasTracesViews || hasLogsViews || hasMetricsViews;

	const { handleExplorerTabChange } = useHandleExplorerTabChange();

	const handleRedirectQuery = (view: ViewProps): void => {
		logEvent('Homepage: Saved view clicked', {
			viewId: view.id,
			viewName: view.name,
			entity: selectedEntity,
		});

		let currentViews: ViewProps[] = [];
		if (selectedEntity === 'logs') {
			currentViews = logsViews;
		} else if (selectedEntity === 'traces') {
			currentViews = tracesViews;
		} else if (selectedEntity === 'metrics') {
			currentViews = metricsViews;
		}

		const currentViewDetails = getViewDetailsUsingViewKey(view.id, currentViews);
		if (!currentViewDetails) return;
		const { query, name, id, panelType: currentPanelType } = currentViewDetails;

		if (selectedEntity) {
			handleExplorerTabChange(
				currentPanelType,
				{
					query,
					name,
					id,
				},
				SOURCEPAGE_VS_ROUTES[selectedEntity],
			);
		}
	};

	useEffect(() => {
		if (hasSavedViews && !loadingUserPreferences) {
			onUpdateChecklistDoneItem('SETUP_SAVED_VIEWS');
		}
	}, [hasSavedViews, onUpdateChecklistDoneItem, loadingUserPreferences]);

	const footerLink = useMemo(() => {
		if (selectedEntity === 'logs') {
			return ROUTES.LOGS_SAVE_VIEWS;
		}
		if (selectedEntity === 'traces') {
			return ROUTES.TRACES_SAVE_VIEWS;
		}
		if (selectedEntity === 'metrics') {
			return ROUTES.METRICS_EXPLORER_VIEWS;
		}
		return '';
	}, [selectedEntity]);

	const getStartedLink = useMemo(() => {
		if (selectedEntity === 'logs') {
			return ROUTES.LOGS_EXPLORER;
		}
		if (selectedEntity === 'traces') {
			return ROUTES.TRACES_EXPLORER;
		}
		if (selectedEntity === 'metrics') {
			return ROUTES.METRICS_EXPLORER_EXPLORER;
		}
		return '';
	}, [selectedEntity]);

	const emptyStateCard = (): JSX.Element => (
		<div className="empty-state-container">
			<div className="empty-state-content-container">
				<div className="empty-state-content">
					<img
						src="/Icons/floppy-disc.svg"
						alt="empty-alert-icon"
						className="empty-state-icon"
					/>

					<div className="empty-title">You have not saved any views yet.</div>

					{user?.role !== USER_ROLES.VIEWER && (
						<div className="empty-description">
							Explore your data and save them as views.
						</div>
					)}
				</div>

				{user?.role !== USER_ROLES.VIEWER && (
					<div className="empty-actions-container">
						<Link to={getStartedLink}>
							<Button
								type="default"
								className="periscope-btn secondary"
								onClick={(): void => {
									logEvent('Homepage: Get Started clicked', {
										source: 'Saved Views',
										entity: selectedEntity,
									});
								}}
							>
								Get Started &nbsp; <ArrowRight size={16} />
							</Button>
						</Link>

						<Button
							type="link"
							className="learn-more-link"
							onClick={(): void => {
								logEvent('Homepage: Learn more clicked', {
									source: 'Saved Views',
									entity: selectedEntity,
								});

								window.open(
									'https://signoz.io/docs/product-features/saved-view/',
									'_blank',
									'noopener noreferrer',
								);
							}}
						>
							Learn more <ArrowUpRight size={12} />
						</Button>
					</div>
				)}
			</div>
		</div>
	);

	const renderSavedViews = (): JSX.Element => (
		<div className="saved-views-list-container home-data-item-container">
			<div className="saved-views-list">
				{selectedEntityViews.slice(0, 5).map((view) => (
					<div
						role="button"
						tabIndex={0}
						className="saved-view-item home-data-item"
						key={view.id}
						onClick={(): void => handleRedirectQuery(view)}
						onKeyDown={(e): void => {
							if (e.key === 'Enter') {
								handleRedirectQuery(view);
							}
						}}
					>
						<div className="saved-view-item-name-container home-data-item-name-container">
							<img
								src={
									view.id % 2 === 0 ? '/Icons/eight-ball.svg' : '/Icons/circus-tent.svg'
								}
								alt="alert-rules"
								className="alert-rules-img"
							/>

							<div className="saved-view-item-name home-data-item-name">
								{view.name}
							</div>
						</div>

						<div className="saved-view-item-description home-data-item-tag">
							{view.tags?.map((tag: string) => {
								if (tag === '') {
									return null;
								}

								return (
									<Tag color={tag} key={tag}>
										{tag}
									</Tag>
								);
							})}
						</div>

						<Button
							type="link"
							size="small"
							className="periscope-btn link"
							onClick={(): void => handleRedirectQuery(view)}
						>
							<CompassIcon size={16} />
						</Button>
					</div>
				))}

				{selectedEntityViews.length === 0 && (
					<div className="saved-views-list-empty-state">
						<div className="saved-views-list-empty-state-message">
							No saved views found.
						</div>
					</div>
				)}

				{selectedEntity === 'logs' && logsViewsError && (
					<div className="logs-saved-views-error-container">
						<div className="logs-saved-views-error-message">
							Oops, something went wrong while loading your saved views.
						</div>
					</div>
				)}

				{selectedEntity === 'traces' && tracesViewsError && (
					<div className="traces-saved-views-error-container">
						<div className="traces-saved-views-error-message">
							Oops, something went wrong while loading your saved views.
						</div>
					</div>
				)}

				{selectedEntity === 'metrics' && metricsViewsError && (
					<div className="metrics-saved-views-error-container">
						<div className="metrics-saved-views-error-message">
							Oops, something went wrong while loading your saved views.
						</div>
					</div>
				)}
			</div>
		</div>
	);

	const handleTabChange = (tab: string): void => {
		logEvent('Homepage: Saved views switched', {
			tab,
		});
		let currentViews: ViewProps[] = [];
		if (tab === 'logs') {
			currentViews = logsViews;
		} else if (tab === 'traces') {
			currentViews = tracesViews;
		} else if (tab === 'metrics') {
			currentViews = metricsViews;
		}
		setSelectedEntityViews(currentViews);
		setSelectedEntity(tab);
	};

	if (logsViewsLoading || tracesViewsLoading || metricsViewsLoading) {
		return (
			<Card className="saved-views-list-card home-data-card loading-card">
				<Card.Content>
					<Skeleton active />
				</Card.Content>
			</Card>
		);
	}

	if (logsViewsError || tracesViewsError || metricsViewsError) {
		return (
			<Card className="saved-views-list-card home-data-card error-card">
				<Card.Content>
					<Skeleton active />
				</Card.Content>
			</Card>
		);
	}

	return (
		<Card className="saved-views-list-card home-data-card">
			{hasSavedViews && (
				<Card.Header>
					<div className="saved-views-header home-data-card-header">
						Saved Views
						<div className="saved-views-header-actions">
							<Button.Group className="views-tabs">
								<Button
									value="logs"
									className={
										// eslint-disable-next-line sonarjs/no-duplicate-string
										selectedEntity === 'logs' ? 'selected tab' : 'tab'
									}
									onClick={(): void => handleTabChange('logs')}
								>
									<img src="/Icons/logs.svg" alt="logs-icon" className="logs-icon" />
									Logs
								</Button>
								<Button
									value="traces"
									className={
										// eslint-disable-next-line sonarjs/no-duplicate-string
										selectedEntity === 'traces' ? 'selected tab' : 'tab'
									}
									onClick={(): void => handleTabChange('traces')}
								>
									<DraftingCompass size={14} /> Traces
								</Button>
								<Button
									value="metrics"
									className={
										// eslint-disable-next-line sonarjs/no-duplicate-string
										selectedEntity === 'metrics' ? 'selected tab' : 'tab'
									}
									onClick={(): void => handleTabChange('metrics')}
								>
									<BarChart size={14} /> Metrics
								</Button>
							</Button.Group>
						</div>
					</div>
				</Card.Header>
			)}

			<Card.Content>
				{selectedEntityViews.length > 0 ? renderSavedViews() : emptyStateCard()}
			</Card.Content>

			{selectedEntityViews.length > 0 && (
				<Card.Footer>
					<div className="services-footer home-data-card-footer">
						<Link to={footerLink}>
							<Button
								type="link"
								className="periscope-btn link learn-more-link"
								onClick={(): void => {
									logEvent('Homepage: All saved views clicked', {
										entity: selectedEntity,
									});
								}}
							>
								All Views <ArrowRight size={12} />
							</Button>
						</Link>
					</div>
				</Card.Footer>
			)}
		</Card>
	);
}
