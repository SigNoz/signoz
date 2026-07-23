import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, Skeleton } from 'antd';
import { Badge } from '@signozhq/ui/badge';
import logEvent from 'api/common/logEvent';
import { useListDashboardsForUserV2 } from 'api/generated/services/dashboard';
import {
	DashboardtypesListOrderDTO,
	DashboardtypesListSortDTO,
} from 'api/generated/services/sigNoz.schemas';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { ArrowRight, ArrowUpRight, Plus } from '@signozhq/icons';
import Card from 'periscope/components/Card/Card';
import { useAppContext } from 'providers/App/App';
import { USER_ROLES } from 'types/roles';
import { openInNewTab } from 'utils/navigation';

import dialsUrl from '@/assets/Icons/dials.svg';

import { getItemIcon } from '../constants';

// The five most-recent dashboards from the V2 list API.
interface RecentDashboard {
	id: string;
	title: string;
	tags: string[];
}

export default function Dashboards({
	onUpdateChecklistDoneItem,
	loadingUserPreferences,
}: {
	onUpdateChecklistDoneItem: (itemKey: string) => void;
	loadingUserPreferences: boolean;
}): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const { user } = useAppContext();

	const {
		data: v2List,
		isLoading: isDashboardListLoading,
		isError: isDashboardListError,
	} = useListDashboardsForUserV2({
		sort: DashboardtypesListSortDTO.updated_at,
		order: DashboardtypesListOrderDTO.desc,
		limit: 5,
		offset: 0,
	});

	const sortedDashboards = useMemo<RecentDashboard[]>(
		() =>
			(v2List?.data?.dashboards ?? []).map((d) => ({
				id: d.id,
				title: d.spec?.display?.name ?? d.name,
				tags: (d.tags ?? []).map((t) => (t.value ? `${t.key}:${t.value}` : t.key)),
			})),
		[v2List],
	);

	useEffect(() => {
		if (sortedDashboards.length > 0 && !loadingUserPreferences) {
			onUpdateChecklistDoneItem('SETUP_DASHBOARDS');
		}
	}, [sortedDashboards, onUpdateChecklistDoneItem, loadingUserPreferences]);

	const emptyStateCard = (): JSX.Element => (
		<div className="empty-state-container">
			<div className="empty-state-content-container">
				<div className="empty-state-content">
					<img src={dialsUrl} alt="empty-alert-icon" className="empty-state-icon" />

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
							dashboardName: dashboard.title,
						});
						if (event.metaKey || event.ctrlKey) {
							openInNewTab(getLink());
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
									onClickHandler(e as unknown as React.MouseEvent<HTMLElement>);
								}
							}}
						>
							<div className="dashboard-item-name-container home-data-item-name-container">
								<img
									src={getItemIcon(dashboard.id)}
									alt="alert-rules"
									className="alert-rules-img"
								/>

								<div className="alert-rule-item-name home-data-item-name">
									{dashboard.title}
								</div>
							</div>

							<div className="alert-rule-item-description home-data-item-tag">
								{dashboard.tags.map((tag) => (
									<Badge color="sienna" variant="outline" key={tag}>
										{tag}
									</Badge>
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
