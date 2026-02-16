import { Typography } from 'antd';

export default function HostsEmptyOrIncorrectMetrics({
	noData,
	incorrectData,
	endTimeBeforeRetention,
	noRecordsInSelectedTimeRangeAndFilters,
}: {
	noData: boolean;
	incorrectData: boolean;
	endTimeBeforeRetention?: boolean;
	noRecordsInSelectedTimeRangeAndFilters?: boolean;
}): JSX.Element {
	return (
		<div className="hosts-empty-state-container">
			<div className="hosts-empty-state-container-content">
				<img className="eyes-emoji" src="/Images/eyesEmoji.svg" alt="eyes emoji" />

				{noRecordsInSelectedTimeRangeAndFilters && (
					<div className="no-hosts-message">
						<Typography.Text className="no-hosts-message-text">
							No host metrics in the selected time range and filters. Please adjust
							your time range or filters.
						</Typography.Text>
					</div>
				)}

				{endTimeBeforeRetention && (
					<div className="no-hosts-message">
						<Typography.Title level={5} className="no-hosts-message-title">
							End time before retention
						</Typography.Title>
						<Typography.Text className="no-hosts-message-text">
							Your requested end time is earlier than the earliest detected time of
							host metrics data, please adjust your end time.
						</Typography.Text>
					</div>
				)}

				{noData && (
					<div className="no-hosts-message">
						<Typography.Title level={5} className="no-hosts-message-title">
							No host metrics data received yet.
						</Typography.Title>

						<Typography.Text className="no-hosts-message-text">
							Infrastructure monitoring requires the{' '}
							<a
								href="https://github.com/open-telemetry/semantic-conventions/blob/main/docs/system/system-metrics.md"
								target="_blank"
								rel="noreferrer"
							>
								OpenTelemetry system metrics
							</a>
							. Please refer to{' '}
							<a
								href="https://signoz.io/docs/userguide/hostmetrics"
								target="_blank"
								rel="noreferrer"
							>
								this
							</a>{' '}
							to learn how to send host metrics to SigNoz.
						</Typography.Text>
					</div>
				)}

				{incorrectData && (
					<Typography.Text className="incorrect-metrics-message">
						To see host metrics, upgrade to the latest version of SigNoz k8s-infra
						chart. Please contact support if you need help.
					</Typography.Text>
				)}
			</div>
		</div>
	);
}
