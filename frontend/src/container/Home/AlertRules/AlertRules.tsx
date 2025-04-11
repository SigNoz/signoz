import { Button, Skeleton, Tag } from 'antd';
import getAll from 'api/alerts/getAll';
import logEvent from 'api/common/logEvent';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { ArrowRight, ArrowUpRight, Plus } from 'lucide-react';
import Card from 'periscope/components/Card/Card';
import { useAppContext } from 'providers/App/App';
import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { Link, useLocation } from 'react-router-dom';
import { GettableAlert } from 'types/api/alerts/get';
import { USER_ROLES } from 'types/roles';

export default function AlertRules({
	onUpdateChecklistDoneItem,
	loadingUserPreferences,
}: {
	onUpdateChecklistDoneItem: (itemKey: string) => void;
	loadingUserPreferences: boolean;
}): JSX.Element {
	const { user } = useAppContext();
	const [rulesExist, setRulesExist] = useState(false);

	const [sortedAlertRules, setSortedAlertRules] = useState<GettableAlert[]>([]);

	const location = useLocation();
	const params = new URLSearchParams(location.search);

	// Fetch Alerts
	const { data: alerts, isError, isLoading } = useQuery('allAlerts', {
		queryFn: getAll,
		cacheTime: 0,
	});

	useEffect(() => {
		const rules = alerts?.payload || [];
		setRulesExist(rules.length > 0);

		const sortedRules = rules.sort((a, b) => {
			// First, prioritize firing alerts
			if (a.state === 'firing' && b.state !== 'firing') return -1;
			if (a.state !== 'firing' && b.state === 'firing') return 1;

			// Then sort by updateAt timestamp
			const aUpdateAt = new Date(a.updateAt).getTime();
			const bUpdateAt = new Date(b.updateAt).getTime();
			return bUpdateAt - aUpdateAt;
		});

		if (sortedRules.length > 0 && !loadingUserPreferences) {
			onUpdateChecklistDoneItem('SETUP_ALERTS');
		}

		setSortedAlertRules(sortedRules.slice(0, 5));
	}, [alerts, onUpdateChecklistDoneItem, loadingUserPreferences]);

	const emptyStateCard = (): JSX.Element => (
		<div className="empty-state-container">
			<div className="empty-state-content-container">
				<div className="empty-state-content">
					<img
						src="/Icons/beacon.svg"
						alt="empty-alert-icon"
						className="empty-state-icon"
					/>

					<div className="empty-title">No Alert rules yet.</div>

					{user?.role !== USER_ROLES.VIEWER && (
						<div className="empty-description">
							Create an Alert Rule to get started
						</div>
					)}
				</div>

				{user?.role !== USER_ROLES.VIEWER && (
					<div className="empty-actions-container">
						<Link to={ROUTES.ALERTS_NEW}>
							<Button
								type="default"
								className="periscope-btn secondary"
								icon={<Plus size={16} />}
								onClick={(): void => {
									logEvent('Homepage: Create alert rule clicked', {});
								}}
							>
								Create Alert Rule
							</Button>
						</Link>

						<Button
							type="link"
							className="learn-more-link"
							onClick={(): void => {
								logEvent('Homepage: Learn more clicked', {
									source: 'Alert Rules',
								});

								window.open(
									'https://signoz.io/docs/alerts/',
									'_blank',
									'noreferrer noopener',
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

	const onEditHandler = (record: GettableAlert) => (): void => {
		logEvent('Homepage: Alert clicked', {
			ruleId: record.id,
			ruleName: record.alert,
			ruleState: record.state,
		});

		const compositeQuery = mapQueryDataFromApi(record.condition.compositeQuery);
		params.set(
			QueryParams.compositeQuery,
			encodeURIComponent(JSON.stringify(compositeQuery)),
		);

		params.set(QueryParams.panelTypes, record.condition.compositeQuery.panelType);

		params.set(QueryParams.ruleId, record.id.toString());

		history.push(`${ROUTES.ALERT_OVERVIEW}?${params.toString()}`);
	};

	const renderAlertRules = (): JSX.Element => (
		<div className="alert-rules-container home-data-item-container">
			<div className="alert-rules-list">
				{sortedAlertRules.map((rule) => (
					<div
						role="button"
						tabIndex={0}
						className="alert-rule-item home-data-item"
						key={rule.id}
						onClick={onEditHandler(rule)}
						onKeyDown={(e): void => {
							if (e.key === 'Enter') {
								onEditHandler(rule);
							}
						}}
					>
						<div className="alert-rule-item-name-container home-data-item-name-container">
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
								{rule.alert}
							</div>
						</div>

						<div className="alert-rule-item-description home-data-item-tag">
							<Tag color={rule?.labels?.severity}>{rule?.labels?.severity}</Tag>

							{rule?.state === 'firing' && (
								<Tag color="red" className="firing-tag">
									{rule?.state}
								</Tag>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);

	if (isLoading) {
		return (
			<Card className="dashboards-list-card home-data-card loading-card">
				<Card.Content>
					<Skeleton active />
				</Card.Content>
			</Card>
		);
	}

	if (isError) {
		return (
			<Card className="dashboards-list-card home-data-card error-card">
				<Card.Content>
					<Skeleton active />
				</Card.Content>
			</Card>
		);
	}

	return (
		<Card className="alert-rules-card home-data-card">
			{rulesExist && (
				<Card.Header>
					<div className="alert-rules-header home-data-card-header">Alerts</div>
				</Card.Header>
			)}
			<Card.Content>
				{rulesExist ? renderAlertRules() : emptyStateCard()}
			</Card.Content>

			{rulesExist && (
				<Card.Footer>
					<div className="alert-rules-footer home-data-card-footer">
						<Link to={ROUTES.LIST_ALL_ALERT}>
							<Button
								type="link"
								className="periscope-btn link learn-more-link"
								onClick={(): void => {
									logEvent('Homepage: All alert rules clicked', {});
								}}
							>
								All Alert Rules <ArrowRight size={12} />
							</Button>
						</Link>
					</div>
				</Card.Footer>
			)}
		</Card>
	);
}
