/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable jsx-a11y/img-redundant-alt */
import './AlertsEmptyState.styles.scss';

import {
	ArrowRightOutlined,
	PlayCircleFilled,
	PlusOutlined,
} from '@ant-design/icons';
import { Button, Divider, Flex, Typography } from 'antd';
import ROUTES from 'constants/routes';
import useComponentPermission from 'hooks/useComponentPermission';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

function InfoLinkText({
	infoText,
	link,
	leftIconVisible,
	rightIconVisible,
}: {
	infoText: string;
	link: string;
	leftIconVisible: boolean;
	rightIconVisible: boolean;
}): JSX.Element {
	return (
		<Flex
			onClick={() => window.open(link, '_blank')}
			className="info-link-container"
		>
			{leftIconVisible && <PlayCircleFilled />}
			<Typography.Text className="info-text">{infoText}</Typography.Text>
			{rightIconVisible && <ArrowRightOutlined rotate={315} />}
		</Flex>
	);
}

export function AlertsEmptyState(): JSX.Element {
	const { t } = useTranslation('common');
	const { role, featureResponse } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);
	const [addNewAlert] = useComponentPermission(
		['add_new_alert', 'action'],
		role,
	);

	const { notifications: notificationsApi } = useNotifications();

	const handleError = useCallback((): void => {
		notificationsApi.error({
			message: t('something_went_wrong'),
		});
	}, [notificationsApi, t]);

	const onClickNewAlertHandler = useCallback(() => {
		featureResponse
			.refetch()
			.then(() => {
				history.push(ROUTES.ALERTS_NEW);
			})
			.catch(handleError);
	}, [featureResponse, handleError]);

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
								alt="header-image"
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
								type="primary"
								data-testid="add-alert"
							>
								New Alert Rule
							</Button>
							{InfoLinkText({
								infoText: 'Watch a tutorial',
								link: 'https://signoz.io/docs/introduction/',
								leftIconVisible: true,
								rightIconVisible: true,
							})}
						</div>

						{InfoLinkText({
							infoText: 'How to create Metric-based alerts',
							link: 'https://signoz.io/',
							leftIconVisible: false,
							rightIconVisible: true,
						})}

						{InfoLinkText({
							infoText: 'How to create log-based alerts',
							link: 'https://signoz.io/',
							leftIconVisible: false,
							rightIconVisible: true,
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

				<div
					className="alert-info-card"
					onClick={() => window.open('https://signoz.io/pricing/', '_blank')}
				>
					<div className="alert-card-text">
						<Typography.Text className="alert-card-text-header">
							Alert on slow external API calls
						</Typography.Text>
						<Typography.Text className="alert-card-text-subheader">
							Monitor your external API calls
						</Typography.Text>
					</div>
					<ArrowRightOutlined />
				</div>

				<div
					className="alert-info-card"
					onClick={() => window.open('https://signoz.io/pricing/', '_blank')}
				>
					<div className="alert-card-text">
						<Typography.Text className="alert-card-text-header">
							Alert on high CPU usage
						</Typography.Text>
						<Typography.Text className="alert-card-text-subheader">
							Monitor your server’s CPU usage
						</Typography.Text>
					</div>
					<ArrowRightOutlined />
				</div>
			</div>
		</div>
	);
}
