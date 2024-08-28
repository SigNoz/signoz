import './MessagingQueues.styles.scss';

import { ExclamationCircleFilled } from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import { Button, Modal } from 'antd';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import useUrlQuery from 'hooks/useUrlQuery';
import { Calendar, ListMinus, Undo } from 'lucide-react';
import { useHistory, useLocation } from 'react-router-dom';

import { ComingSoon } from './MQCommon/MQCommon';

function MessagingQueues(): JSX.Element {
	const urlQuery = useUrlQuery();
	const location = useLocation();
	const history = useHistory();

	const onReset = (): void => {
		urlQuery.set(QueryParams.relativeTime, '30m');
		const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
		history.replace(generatedUrl);
	};

	const { confirm } = Modal;

	const showConfirm = (): void => {
		confirm({
			icon: <ExclamationCircleFilled />,
			content:
				'Before navigating to the details page, please make sure you have configured all the required setup to ensure correct data monitoring.',
			className: 'overview-confirm-modal',
			onOk() {
				history.push(ROUTES.MESSAGING_QUEUES_DETAIL);
			},
			okText: 'Proceed',
		});
	};

	return (
		<div className="messaging-queue-container">
			<div className="messaging-breadcrumb">
				<ListMinus size={16} />
				Messaging Queues
			</div>
			<div className="messaging-header">
				<div className="header-config">Kafka / Overview</div>
				<div className="detail-page-timeselector">
					<DateTimeSelectionV2 showAutoRefresh={false} hideShareModal />
					<Button
						type="text"
						icon={<Undo size={14} />}
						className="reset-btn"
						onClick={onReset}
					>
						Reset
					</Button>
				</div>
			</div>
			<div className="messaging-overview">
				<p className="overview-text">
					Start sending data in as little as 20 minutes
				</p>
				<p className="overview-subtext">Connect and Monitor Your Data Streams</p>
				<div className="overview-doc-area">
					<div className="overview-info-card">
						<div>
							<p className="card-title">Configure Consumer</p>
							<p className="card-info-text">
								Connect your consumer and producer data sources to start monitoring.
							</p>
						</div>
						<div className="button-grp">
							<Button
								type="default"
								onClick={(): void =>
									history.push(ROUTES.GET_STARTED_APPLICATION_MONITORING)
								}
								// todo-sagar check for cloud condition
							>
								Get Started
							</Button>
							<Button type="text">Docs</Button>
						</div>
					</div>
					<div className="overview-info-card middle-card">
						<div>
							<p className="card-title">Configure Producer</p>
							<p className="card-info-text">
								Connect your consumer and producer data sources to start monitoring.
							</p>
						</div>
						<div className="button-grp">
							<Button
								type="default"
								onClick={(): void =>
									history.push(ROUTES.GET_STARTED_APPLICATION_MONITORING)
								}
							>
								Get Started
							</Button>
							<Button type="text">Docs</Button>
						</div>
					</div>
					<div className="overview-info-card">
						<div>
							<p className="card-title">Monitor kafka</p>
							<p className="card-info-text">
								Set up your Kafka monitoring to track consumer and producer activities.
							</p>
						</div>
						<div className="button-grp">
							<Button
								type="default"
								onClick={(): void =>
									history.push(ROUTES.GET_STARTED_INFRASTRUCTURE_MONITORING)
								}
							>
								Get Started
							</Button>
							<Button type="text">Docs</Button>
						</div>
					</div>
				</div>
				<div className="summary-section">
					<div className="summary-card">
						<div className="summary-title">
							<p>Consumer Lag</p>
							<div className="time-value">
								<Calendar size={14} color={Color.BG_SLATE_200} />
								<p className="time-value">1D</p>
							</div>
						</div>
						<div className="view-detail-btn">
							<Button type="primary" onClick={showConfirm}>
								View Details
							</Button>
						</div>
					</div>
					<div className="summary-card coming-soon-card">
						<div className="summary-title">
							<p>Avg. Partition latency</p>
							<div className="time-value">
								<Calendar size={14} color={Color.BG_SLATE_200} />
								<p className="time-value">1D</p>
							</div>
						</div>
						<div className="view-detail-btn">
							<ComingSoon />
						</div>
					</div>
					<div className="summary-card coming-soon-card">
						<div className="summary-title">
							<p>Avg. Partition latency</p>
							<div className="time-value">
								<Calendar size={14} color={Color.BG_SLATE_200} />
								<p className="time-value">1D</p>
							</div>
						</div>
						<div className="view-detail-btn">
							<ComingSoon />
						</div>
					</div>
					<div className="summary-card coming-soon-card">
						<div className="summary-title">
							<p>Avg. Partition latency</p>
							<div className="time-value">
								<Calendar size={14} color={Color.BG_SLATE_200} />
								<p className="time-value">1D</p>
							</div>
						</div>
						<div className="view-detail-btn">
							<ComingSoon />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default MessagingQueues;
