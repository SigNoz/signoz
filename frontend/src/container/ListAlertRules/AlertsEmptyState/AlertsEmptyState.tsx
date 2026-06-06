import React, { useCallback, useState } from 'react';
import { Divider } from '@signozhq/ui/divider';
import { Plus, RefreshCw } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import useComponentPermission from 'hooks/useComponentPermission';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { useAppContext } from 'providers/App/App';
import { DataSource } from 'types/common/queryBuilder';
import { isModifierKeyPressed } from 'utils/app';

import alertEmojiUrl from '@/assets/Icons/alert_emoji.svg';

import AlertInfoCard from './AlertInfoCard';
import { ALERT_CARDS, ALERT_INFO_LINKS } from './alertLinks';
import InfoLinkText from './InfoLinkText';

import styles from './AlertsEmptyState.module.scss';

const alertLogEvents = (
	title: string,
	link: string,
	dataSource?: DataSource,
): void => {
	const attributes = {
		link,
		page: 'Alert empty state page',
	};

	void logEvent(title, dataSource ? { ...attributes, dataSource } : attributes);
};

interface AlertsEmptyStateProps {
	onRefresh?: () => void;
}

export function AlertsEmptyState({
	onRefresh,
}: AlertsEmptyStateProps): JSX.Element {
	const { user } = useAppContext();
	const { safeNavigate } = useSafeNavigate();
	const [addNewAlert] = useComponentPermission(
		['add_new_alert', 'action'],
		user.role,
	);

	const [loading, setLoading] = useState(false);

	const onClickNewAlertHandler = useCallback(
		(e: React.MouseEvent) => {
			setLoading(false);
			safeNavigate(ROUTES.ALERTS_NEW, { newTab: isModifierKeyPressed(e) });
		},
		[safeNavigate],
	);

	return (
		<div className={styles.alertListContainer}>
			<div className={styles.alertListViewContent}>
				<div>
					<Typography.Title className={styles.title}>Alert Rules</Typography.Title>
					<Typography.Text className={styles.subtitle}>
						Create and manage alert rules for your resources.
					</Typography.Text>
				</div>
				<section className={styles.emptyAlertInfoContainer}>
					<div className={styles.alertContent}>
						<section className={styles.heading}>
							<img
								src={alertEmojiUrl}
								alt="alert-header"
								style={{ height: '32px', width: '32px' }}
							/>
							<div>
								<Typography.Text className={styles.emptyInfo}>
									No Alert rules yet.{' '}
								</Typography.Text>
								<br />
								<Typography.Text className={styles.emptyAlertAction}>
									Create an Alert Rule to get started
								</Typography.Text>
							</div>
						</section>
						<div className={styles.actionContainer}>
							<div className={styles.buttonGroup}>
								<Button
									onClick={onClickNewAlertHandler}
									disabled={!addNewAlert}
									loading={loading}
									testId="add-alert"
								>
									<span className={styles.buttonContent}>
										<Plus size="md" />
										New Alert Rule
									</span>
								</Button>
								{onRefresh && (
									<Button
										onClick={onRefresh}
										prefix={<RefreshCw />}
										color="secondary"
										testId="list-alerts-empty-refresh-button"
									>
										Refresh
									</Button>
								)}
							</div>
							<InfoLinkText
								infoText="Watch a tutorial on creating a sample alert"
								link="https://youtu.be/xjxNIqiv4_M"
								leftIconVisible
								rightIconVisible
								onClick={(): void =>
									alertLogEvents(
										'Alert: Video tutorial link clicked',
										'https://youtu.be/xjxNIqiv4_M',
									)
								}
							/>
						</div>

						{ALERT_INFO_LINKS.map((info) => {
							const logEventTriggered = (): void =>
								alertLogEvents(
									'Alert: Tutorial doc link clicked',
									info.link,
									info.dataSource,
								);
							return (
								<InfoLinkText
									key={info.link}
									infoText={info.infoText}
									link={info.link}
									leftIconVisible={info.leftIconVisible}
									rightIconVisible={info.rightIconVisible}
									onClick={logEventTriggered}
								/>
							);
						})}
					</div>
				</section>
				<div className={styles.getStartedText}>
					<Divider className="get-started-text__divider">
						<Typography.Text>Or get started with these sample alerts</Typography.Text>
					</Divider>
				</div>

				{ALERT_CARDS.map((card) => {
					const logEventTriggered = (): void =>
						alertLogEvents(
							'Alert: Sample alert link clicked',
							card.link,
							card.dataSource,
						);
					return (
						<AlertInfoCard
							key={card.link}
							header={card.header}
							subheader={card.subheader}
							link={card.link}
							onClick={logEventTriggered}
						/>
					);
				})}
			</div>
		</div>
	);
}
