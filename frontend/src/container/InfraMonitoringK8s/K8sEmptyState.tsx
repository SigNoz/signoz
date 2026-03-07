import { LoadingOutlined } from '@ant-design/icons';
import { Skeleton, Spin, Typography } from 'antd';

interface K8sEmptyStateProps {
	sentAnyMetricsData: boolean;
	endTimeBeforeRetention: boolean;
	entityName: string;
	isLoading: boolean;
	isFetching: boolean;
	hasRecords: boolean;
	hasFilters: boolean;
	isError: boolean;
	errorMessage: string;
}

export function getK8sEmptyState({
	sentAnyMetricsData,
	endTimeBeforeRetention,
	entityName,
	isLoading,
	isFetching,
	hasRecords,
	hasFilters,
	isError,
	errorMessage,
}: K8sEmptyStateProps): React.ReactNode {
	if (isError) {
		return <Typography>{errorMessage || 'Something went wrong'}</Typography>;
	}

	const showTableLoadingState = (isLoading || isFetching) && !hasRecords;

	if (showTableLoadingState) {
		return (
			<div className="hosts-list-loading-state">
				<Skeleton.Input
					className="hosts-list-loading-state-item"
					size="large"
					block
					active
				/>
				<Skeleton.Input
					className="hosts-list-loading-state-item"
					size="large"
					block
					active
				/>
				<Skeleton.Input
					className="hosts-list-loading-state-item"
					size="large"
					block
					active
				/>
			</div>
		);
	}

	const showEmptyState =
		!isFetching &&
		!isLoading &&
		!hasRecords &&
		!sentAnyMetricsData &&
		!hasFilters;

	if (showEmptyState) {
		return (
			<div className="hosts-empty-state-container">
				<div className="hosts-empty-state-container-content">
					<img className="eyes-emoji" src="/Images/eyesEmoji.svg" alt="eyes emoji" />
					<div className="no-hosts-message">
						<Typography.Title level={5} className="no-hosts-message-title">
							No {entityName} metrics data received yet.
						</Typography.Title>
						<Typography.Text className="no-hosts-message-text">
							Please refer to the{' '}
							<a
								href="https://signoz.io/docs/infrastructure-monitoring/k8s-metrics/"
								target="_blank"
								rel="noreferrer"
							>
								Kubernetes Infrastructure Monitoring docs
							</a>{' '}
							to learn how to send K8s metrics to SigNoz.
						</Typography.Text>
					</div>
				</div>
			</div>
		);
	}

	const showEndTimeBeforeRetentionMessage =
		!isFetching &&
		!isLoading &&
		!hasRecords &&
		endTimeBeforeRetention &&
		!hasFilters;

	if (showEndTimeBeforeRetentionMessage) {
		return (
			<div className="hosts-empty-state-container">
				<div className="hosts-empty-state-container-content">
					<img className="eyes-emoji" src="/Images/eyesEmoji.svg" alt="eyes emoji" />
					<div className="no-hosts-message">
						<Typography.Title level={5} className="no-hosts-message-title">
							Queried time range is before earliest {entityName} metrics
						</Typography.Title>
						<Typography.Text className="no-hosts-message-text">
							Your requested end time is earlier than the earliest detected time of{' '}
							{entityName} metrics data, please adjust your end time.
						</Typography.Text>
					</div>
				</div>
			</div>
		);
	}

	const showNoRecordsMessage =
		!isFetching &&
		!isLoading &&
		!hasRecords &&
		!showEmptyState &&
		!showEndTimeBeforeRetentionMessage;

	if (showNoRecordsMessage) {
		return (
			<div className="no-filtered-hosts-message-container">
				<div className="no-filtered-hosts-message-content">
					<img
						src="/Icons/emptyState.svg"
						alt="thinking-emoji"
						className="empty-state-svg"
					/>
					<Typography.Title level={5} className="no-filtered-hosts-title">
						No {entityName} metrics found
					</Typography.Title>
					<Typography.Text className="no-filtered-hosts-message">
						No {entityName} metrics in the selected time range and filters. Please
						adjust your time range or filters.
					</Typography.Text>
				</div>
			</div>
		);
	}

	return null;
}

export function K8sTableLoadingIndicator(): JSX.Element {
	return <Spin indicator={<LoadingOutlined size={14} spin />} />;
}
