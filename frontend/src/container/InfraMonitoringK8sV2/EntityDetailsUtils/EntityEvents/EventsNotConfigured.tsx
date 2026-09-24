import { Typography } from '@signozhq/ui/typography';
import { ArrowRight } from '@signozhq/icons';
import { openInNewTab } from 'utils/navigation';

import emptyStateUrl from '@/assets/Icons/emptyState.svg';

import styles from './EventsNotConfigured.module.scss';

const K8S_EVENTS_DOCS_URL =
	'https://signoz.io/docs/infrastructure-monitoring/k8s-metrics/';

export default function EventsNotConfigured(): JSX.Element {
	const handleLearnMore = (): void => {
		openInNewTab(K8S_EVENTS_DOCS_URL);
	};

	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<img src={emptyStateUrl} alt="not-configured" className={styles.icon} />
				<Typography.Text>
					<span className={styles.title}>No Kubernetes events received yet. </span>
					To view events, enable the k8s events receiver in your OpenTelemetry
					Collector.
				</Typography.Text>

				<div
					className={styles.learnMore}
					onClick={handleLearnMore}
					role="button"
					tabIndex={0}
					onKeyDown={(e): void => {
						if (e.key === 'Enter') {
							handleLearnMore();
						}
					}}
				>
					<Typography.Link className={styles.learnMoreText}>
						Learn how to configure
					</Typography.Link>
					<ArrowRight size={14} />
				</div>
			</div>
		</div>
	);
}
