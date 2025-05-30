import { Button, Skeleton, Tag } from 'antd';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import { useGetAllDashboard } from 'hooks/dashboard/useGetAllDashboard';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { ArrowRight, ArrowUpRight, Plus } from 'lucide-react';
import Card from 'periscope/components/Card/Card';
import { useAppContext } from 'providers/App/App';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dashboard } from 'types/api/dashboard/getAll';
import { USER_ROLES } from 'types/roles';

export default function Dashboards({
	onUpdateChecklistDoneItem,
	loadingUserPreferences,
}: {
	onUpdateChecklistDoneItem: (itemKey: string) => void;
	loadingUserPreferences: boolean;
}): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const { user } = useAppContext();

	const [sortedDashboards, setSortedDashboards] = useState<Dashboard[]>([]);

	// Fetch Dashboards
	const {
		data: dashboardsList,
		isLoading: isDashboardListLoading,
		isError: isDashboardListError,
	} = useGetAllDashboard();

	useEffect(() => {
		if (!dashboardsList) return;

		const sortedDashboards = dashboardsList.data.sort((a, b) => {
			const aUpdateAt = new Date(a.updatedAt).getTime();
			const bUpdateAt = new Date(b.updatedAt).getTime();
			return bUpdateAt - aUpdateAt;
		});

		if (sortedDashboards.length > 0 && !loadingUserPreferences) {
			onUpdateChecklistDoneItem('SETUP_DASHBOARDS');
		}

		setSortedDashboards(sortedDashboards.slice(0, 5));
	}, [dashboardsList, onUpdateChecklistDoneItem, loadingUserPreferences]);

	const emptyStateCard = (): JSX.Element => (
		<div className="empty-state-container">
			<div className="empty-state-content-container">
				<div className="empty-state-content">
					<img
						src="/Icons/dials.svg"
						alt="empty-alert-icon"
						className="empty-state-icon"
					/>

					<div className="empty-title">You don’t have any dashboards yet.</div>

					{user?.role !== USER_ROLES.VIEWER && (
						<div className="empty-description">Create a dashboard to get started</div>
					)}
				</div>

				{user?.role !== USER_ROLES.VIEWER && (
					<div className="empty-actions-container">
						<Link to={ROUTES.ALL_DASHBOARD}>
							<Button
								type="default"
								className="periscope-btn secondary"
								icon={<Plus size={16} />}
								onClick={(): void => {
									logEvent('Homepage: Create dashboard clicked', {});
								}}
							>
								New Dashboard
							</Button>
						</Link>

						<Button
							type="link"
							className="learn-more-link"
							onClick={(): void => {
								logEvent('Homepage: Learn more clicked', {
									source: 'Dashboards',
								});
								window.open(
									'https://signoz.io/docs/userguide/manage-dashboards/',
									'_blank',
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

	const renderDashboardsList = (): JSX.Element => (
		<div className="home-dashboards-list-container home-data-item-container">
			<div className="dashboards-list">
				{sortedDashboards.slice(0, 5).map((dashboard) => {
					const getLink = (): string => `${ROUTES.ALL_DASHBOARD}/${dashboard.id}`;

					const onClickHandler = (event: React.MouseEvent<HTMLElement>): void => {
						event.stopPropagation();
						logEvent('Homepage: Dashboard clicked', {
							dashboardId: dashboard.id,
							dashboardName: dashboard.data.title,
						});
						if (event.metaKey || event.ctrlKey) {
							window.open(getLink(), '_blank');
						} else {
							safeNavigate(getLink());
						}
					};

					return (
						<div
							role="button"
							tabIndex={0}
							className="dashboard-item home-data-item"
							key={dashboard.id}
							onClick={onClickHandler}
							onKeyDown={(e): void => {
								if (e.key === 'Enter') {
									onClickHandler((e as unknown) as React.MouseEvent<HTMLElement>);
								}
							}}
						>
							<div className="dashboard-item-name-container home-data-item-name-container">
								<img
									src={
										Math.random() % 2 === 0
											? '/Icons/eight-ball.svg'
											: '/Icons/circus-tent.svg'
									}
									alt="alert-rules"
									className="alert-rules-img"
								/>

								<div className="alert-rule-item-name home-data-item-name">
									{dashboard.data.title}
								</div>
							</div>

							<div className="alert-rule-item-description home-data-item-tag">
								{dashboard.data.tags?.map((tag) => (
									<Tag color={tag} key={tag}>
										{tag}
									</Tag>
								))}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);

	if (isDashboardListLoading) {
		return (
			<Card className="dashboards-list-card home-data-card loading-card">
				<Card.Content>
					<Skeleton active />
				</Card.Content>
			</Card>
		);
	}

	if (isDashboardListError) {
		return (
			<Card className="dashboards-list-card home-data-card error-card">
				<Card.Content>
					<Skeleton active />
				</Card.Content>
			</Card>
		);
	}

	const dashboardsExist = sortedDashboards.length > 0;

	return (
		<Card className="dashboards-list-card home-data-card">
			{dashboardsExist && (
				<Card.Header>
					<div className="dashboards-header home-data-card-header">Dashboards</div>
				</Card.Header>
			)}
			<Card.Content>
				{dashboardsExist ? renderDashboardsList() : emptyStateCard()}
			</Card.Content>

			{dashboardsExist && (
				<Card.Footer>
					<div className="dashboards-footer home-data-card-footer">
						<Link to={ROUTES.ALL_DASHBOARD}>
							<Button
								type="link"
								className="periscope-btn link learn-more-link"
								onClick={(): void => {
									logEvent('Homepage: All dashboards clicked', {});
								}}
							>
								All Dashboards <ArrowRight size={12} />
							</Button>
						</Link>
					</div>
				</Card.Footer>
			)}
		</Card>
	);
}
