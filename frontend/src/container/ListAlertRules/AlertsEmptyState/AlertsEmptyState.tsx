import './AlertsEmptyState.styles.scss';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Divider, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import useComponentPermission from 'hooks/useComponentPermission';
import history from 'lib/history';
import { useAppContext } from 'providers/App/App';
import { useCallback, useState } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import AlertInfoCard from './AlertInfoCard';
import { ALERT_CARDS, ALERT_INFO_LINKS } from './alertLinks';
import InfoLinkText from './InfoLinkText';

const alertLogEvents = (
	title: string,
	link: string,
	dataSource?: DataSource,
): void => {
	const attributes = {
		link,
		page: 'Alert empty state page',
	};

	logEvent(title, dataSource ? { ...attributes, dataSource } : attributes);
};

export function AlertsEmptyState(): JSX.Element {
	const { user } = useAppContext();
	const [addNewAlert] = useComponentPermission(
		['add_new_alert', 'action'],
		user.role,
	);

	const [loading, setLoading] = useState(false);

	const onClickNewAlertHandler = useCallback(() => {
		setLoading(false);
		history.push(ROUTES.ALERTS_NEW);
	}, []);

	return (
		<div className="alert-list-container">
			<div className="alert-list-view-content">
				<div className="alert-list-title-container">
					<Typography.Title className="title">Alert Rules</Typography.Title>
					<Typography.Text className="subtitle">
						Create and manage alert rules for your resources.
					</Typography.Text>
				</div>
				<section className="empty-alert-info-container">
					<div className="alert-content">
						<section className="heading">
							<img
								src="/Icons/alert_emoji.svg"
								alt="alert-header"
								style={{ height: '32px', width: '32px' }}
							/>
							<div>
								<Typography.Text className="empty-info">
									No Alert rules yet.{' '}
								</Typography.Text>
								<Typography.Text className="empty-alert-action">
									Create an Alert Rule to get started
								</Typography.Text>
							</div>
						</section>
						<div className="action-container">
							<Button
								className="add-alert-btn"
								onClick={onClickNewAlertHandler}
								icon={<PlusOutlined />}
								disabled={!addNewAlert}
								loading={loading}
								type="primary"
								data-testid="add-alert"
							>
								New Alert Rule
							</Button>
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
				<div className="get-started-text">
					<Divider>
						<Typography.Text className="get-started-text">
							Or get started with these sample alerts
						</Typography.Text>
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
