import { Button, Skeleton, Tag } from 'antd';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { ArrowRight, ArrowUpRight, Plus } from 'lucide-react';
import Card from 'periscope/components/Card/Card';
import { Link } from 'react-router-dom';
import { Dashboard } from 'types/api/dashboard/getAll';

export default function Dashboards({
	dashboards,
	isLoading,
	isError,
}: {
	dashboards: Dashboard[];
	isLoading: boolean;
	isError: boolean;
}): JSX.Element {
	const dashboardsExist = dashboards.length > 0;

	const { safeNavigate } = useSafeNavigate();

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

					<div className="empty-description">Create a dashboard to get started</div>
				</div>

				<div className="empty-actions-container">
					<Button
						type="default"
						className="periscope-btn secondary"
						icon={<Plus size={16} />}
					>
						New Dashboard
					</Button>

					<Button type="link" className="learn-more-link">
						Learn more <ArrowUpRight size={12} />
					</Button>
				</div>
			</div>
		</div>
	);

	const renderDashboardsList = (): JSX.Element => (
		<div className="home-dashboards-list-container home-data-item-container">
			<div className="dashboards-list">
				{dashboards.map((dashboard) => {
					const getLink = (): string => `${ROUTES.ALL_DASHBOARD}/${dashboard.uuid}`;

					const onClickHandler = (event: React.MouseEvent<HTMLElement>): void => {
						event.stopPropagation();
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
										dashboard.id % 2 === 0
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

	if (isLoading) {
		<Card className="dashboards-list-card home-data-card">
			<Card.Content>
				<Skeleton active />
			</Card.Content>
		</Card>;
	}

	if (isError) {
		return (
			<Card className="dashboards-list-card home-data-card">
				<Card.Content>
					<Skeleton active />
				</Card.Content>
			</Card>
		);
	}

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
							<Button type="link" className="periscope-btn link learn-more-link">
								All Dashboards <ArrowRight size={12} />
							</Button>
						</Link>
					</div>
				</Card.Footer>
			)}
		</Card>
	);
}
