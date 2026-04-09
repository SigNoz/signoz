import styles from './HostsEmptyOrIncorrectMetrics.module.scss';

export default function HostsEmptyOrIncorrectMetrics({
	noData,
	incorrectData,
}: {
	noData: boolean;
	incorrectData: boolean;
}): JSX.Element {
	return (
		<div className={styles.hostsEmptyStateContainer}>
			<div className={styles.hostsEmptyStateContainerContent}>
				<img
					className={styles.eyesEmoji}
					src="/Images/eyesEmoji.svg"
					alt="eyes emoji"
				/>

				{noData && (
					<div className={styles.noHostsMessage}>
						<h5 className={styles.noHostsMessageTitle}>
							No host metrics data received yet.
						</h5>

						<p className={styles.messageBody}>
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
						</p>
					</div>
				)}

				{incorrectData && (
					<p className={styles.messageBody}>
						To see host metrics, upgrade to the latest version of SigNoz k8s-infra
						chart. Please contact support if you need help.
					</p>
				)}
			</div>
		</div>
	);
}
