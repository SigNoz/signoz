import { useEffect } from 'react';
import { Button, Skeleton } from 'antd';
import { Badge } from '@signozhq/ui/badge';
import logEvent from 'api/common/logEvent';
import type { RuletypesListableRuleDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { AppLink } from 'lib/router/AppLink';
import { navigate } from 'lib/router/navigation';
import { useAppLocation } from 'lib/router/useAppLocation';
import { ArrowRight, ArrowUpRight, Plus } from '@signozhq/icons';
import Card from 'periscope/components/Card/Card';
import { useAppContext } from 'providers/App/App';
import { USER_ROLES } from 'types/roles';

import beaconUrl from '@/assets/Icons/beacon.svg';

import { getItemIcon } from '../constants';
import { useHomeAlertRules } from './useHomeAlertRules';

export default function AlertRules({
	onUpdateChecklistDoneItem,
	loadingUserPreferences,
}: {
	onUpdateChecklistDoneItem: (itemKey: string) => void;
	loadingUserPreferences: boolean;
}): JSX.Element {
	const { user } = useAppContext();

	const location = useAppLocation();
	const params = new URLSearchParams(location.search);

	// Fetch Alerts
	const { rules: alertRules, isError, isLoading } = useHomeAlertRules();
	const rulesExist = alertRules.length > 0;

	useEffect(() => {
		if (rulesExist && !loadingUserPreferences) {
			onUpdateChecklistDoneItem('SETUP_ALERTS');
		}
	}, [rulesExist, onUpdateChecklistDoneItem, loadingUserPreferences]);

	const emptyStateCard = (): JSX.Element => (
		<div className="empty-state-container">
			<div className="empty-state-content-container">
				<div className="empty-state-content">
					<img src={beaconUrl} alt="empty-alert-icon" className="empty-state-icon" />

					<div className="empty-title">No Alert rules yet.</div>

					{user?.role !== USER_ROLES.VIEWER && (
						<div className="empty-description">
							Create an Alert Rule to get started
						</div>
					)}
				</div>

				{user?.role !== USER_ROLES.VIEWER && (
					<div className="empty-actions-container">
						<AppLink to={ROUTES.ALERTS_NEW}>
							<Button
								type="default"
								className="periscope-btn secondary"
								icon={<Plus size={16} />}
								onClick={(): void => {
									void logEvent('Homepage: Create alert rule clicked', {});
								}}
							>
								Create Alert Rule
							</Button>
						</AppLink>

						<Button
							type="link"
							className="learn-more-link"
							onClick={(): void => {
								void logEvent('Homepage: Learn more clicked', {
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

	const onEditHandler = (record: RuletypesListableRuleDTO) => (): void => {
		void logEvent('Homepage: Alert clicked', {
			ruleId: record.id,
			ruleName: record.alert,
			ruleState: record.state,
		});

		params.set(QueryParams.ruleId, record.id);

		navigate(`${ROUTES.ALERT_OVERVIEW}?${params.toString()}`);
	};

	const renderAlertRules = (): JSX.Element => (
		<div className="alert-rules-container home-data-item-container">
			<div className="alert-rules-list">
				{alertRules.map((rule) => (
					<div
						role="button"
						tabIndex={0}
						className="alert-rule-item home-data-item"
						data-testid={`home-alert-rule-${rule.id}`}
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
								src={getItemIcon(rule.id)}
								alt="alert-rules"
								className="alert-rules-img"
							/>

							<div className="alert-rule-item-name home-data-item-name">
								{rule.alert}
							</div>
						</div>

						<div className="alert-rule-item-description home-data-item-tag">
							<Badge textTransform="none" color="archive" variant="outlined">
								{rule?.labels?.severity}
							</Badge>

							{rule.state === 'firing' && (
								<Badge color="danger" variant="outlined">
									{rule.state}
								</Badge>
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
					<div
						className="alert-rules-header home-data-card-header"
						data-testid="home-section-alerts"
					>
						Alerts
					</div>
				</Card.Header>
			)}
			<Card.Content>
				{rulesExist ? renderAlertRules() : emptyStateCard()}
			</Card.Content>

			{rulesExist && (
				<Card.Footer>
					<div className="alert-rules-footer home-data-card-footer">
						<AppLink to={ROUTES.LIST_ALL_ALERT}>
							<Button
								type="link"
								className="periscope-btn link learn-more-link"
								onClick={(): void => {
									void logEvent('Homepage: All alert rules clicked', {});
								}}
							>
								All Alert Rules <ArrowRight size={12} />
							</Button>
						</AppLink>
					</div>
				</Card.Footer>
			)}
		</Card>
	);
}
