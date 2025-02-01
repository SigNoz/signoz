import { Typography } from 'antd';

export default function HostsEmptyOrIncorrectMetrics({
	noData,
	incorrectData,
	clusterNames,
	nodeNames,
}: {
	noData: boolean;
	incorrectData: boolean;
	clusterNames: string[];
	nodeNames: string[];
}): JSX.Element {
	let emptyStateMessage = (
		<Typography.Text className="no-hosts-message-text">
			No host metrics were detected. To monitor your hosts, you&apos;ll need to
			send{' '}
			<a
				href="https://github.com/open-telemetry/semantic-conventions/blob/main/docs/system/system-metrics.md"
				target="_blank"
				rel="noreferrer"
			>
				OpenTelemetry system metrics
			</a>
			. Check out our host metrics setup guide{' '}
			<a
				href="https://signoz.io/docs/userguide/hostmetrics"
				target="_blank"
				rel="noreferrer"
			>
				here
			</a>{' '}
			to get started.
		</Typography.Text>
	);

	if (nodeNames.length > 0) {
		const nodeNamesString =
			nodeNames.length > 1
				? `${nodeNames.slice(0, -1).join(', ')} and ${
						nodeNames[nodeNames.length - 1]
				  }`
				: nodeNames[0];
		emptyStateMessage = (
			<Typography.Text className="no-hosts-message-text">
				The k8s-infra chart version installed in nodes {nodeNamesString} has a known
				issue where container metrics from agent pods are incorrectly categorized as
				host metrics. To resolve this, please update to the latest version of the
				SigNoz k8s-infra chart. Reach out to support if you need help with this.
			</Typography.Text>
		);
	}

	if (clusterNames.length > 0) {
		const clusterNamesString =
			clusterNames.length > 1
				? `${clusterNames.slice(0, -1).join(', ')} and ${
						clusterNames[clusterNames.length - 1]
				  }`
				: clusterNames[0];
		emptyStateMessage = (
			<Typography.Text className="no-hosts-message-text">
				The k8s-infra chart version installed in clusters {clusterNamesString} has a
				known issue where container metrics from agent pods are incorrectly
				categorized as host metrics. To resolve this, please update to the latest
				version of the SigNoz k8s-infra chart. Reach out to support if you need help
				with this.
			</Typography.Text>
		);
	}

	return (
		<div className="hosts-empty-state-container">
			<div className="hosts-empty-state-container-content">
				<img className="eyes-emoji" src="/Images/eyesEmoji.svg" alt="eyes emoji" />

				{noData && (
					<div className="no-hosts-message">
						<Typography.Title level={5} className="no-hosts-message-title">
							No host metrics data received yet.
						</Typography.Title>

						{emptyStateMessage}
					</div>
				)}

				{!clusterNames.length && !nodeNames.length && incorrectData && (
					<Typography.Text className="incorrect-metrics-message">
						To see host metrics, upgrade to the latest version of SigNoz k8s-infra
						chart. Please contact support if you need help.
					</Typography.Text>
				)}
			</div>
		</div>
	);
}
