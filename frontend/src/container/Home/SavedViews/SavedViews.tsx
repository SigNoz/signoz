import { Button, Skeleton, Tag } from 'antd';
import logEvent from 'api/common/logEvent';
import { getViewDetailsUsingViewKey } from 'components/ExplorerCard/utils';
import ROUTES from 'constants/routes';
import { useGetAllViews } from 'hooks/saveViews/useGetAllViews';
import { useHandleExplorerTabChange } from 'hooks/useHandleExplorerTabChange';
import {
	ArrowRight,
	ArrowUpRight,
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

	const logsViews = useMemo(() => [...(logsViewsData?.data.data || [])], [
		logsViewsData,
	]);

	const tracesViews = useMemo(() => [...(tracesViewsData?.data.data || [])], [
		tracesViewsData,
	]);

	useEffect(() => {
		setSelectedEntityViews(selectedEntity === 'logs' ? logsViews : tracesViews);
	}, [selectedEntity, logsViews, tracesViews]);

	const hasTracesViews = tracesViews.length > 0;
	const hasLogsViews = logsViews.length > 0;

	const hasSavedViews = hasTracesViews || hasLogsViews;

	const { handleExplorerTabChange } = useHandleExplorerTabChange();

	const handleRedirectQuery = (view: ViewProps): void => {
		logEvent('Homepage: Saved view clicked', {
			viewId: view.id,
			viewName: view.name,
			entity: selectedEntity,
		});

		const currentViewDetails = getViewDetailsUsingViewKey(
			view.id,
			selectedEntity === 'logs' ? logsViews : tracesViews,
		);
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
						<Link
							to={
								selectedEntity === 'logs'
									? ROUTES.LOGS_EXPLORER
									: ROUTES.TRACES_EXPLORER
							}
						>
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
			</div>
		</div>
	);

	const handleTabChange = (tab: string): void => {
		logEvent('Homepage: Saved views switched', {
			tab,
		});
		setSelectedEntityViews(tab === 'logs' ? logsViews : tracesViews);
		setSelectedEntity(tab);
	};

	if (logsViewsLoading || tracesViewsLoading) {
		return (
			<Card className="saved-views-list-card home-data-card loading-card">
				<Card.Content>
					<Skeleton active />
				</Card.Content>
			</Card>
		);
	}

	if (logsViewsError || tracesViewsError) {
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
						<Link
							to={
								selectedEntity === 'logs'
									? ROUTES.LOGS_SAVE_VIEWS
									: ROUTES.TRACES_SAVE_VIEWS
							}
						>
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
