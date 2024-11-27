import { Typography } from 'antd';

export default function HostsEmptyOrIncorrectMetrics({
	noData,
	incorrectData,
}: {
	noData: boolean;
	incorrectData: boolean;
}): JSX.Element {
	return (
		<div className="hosts-empty-state-container">
			<div className="hosts-empty-state-container-content">
				<img className="eyes-emoji" src="/Images/eyesEmoji.svg" alt="eyes emoji" />

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
