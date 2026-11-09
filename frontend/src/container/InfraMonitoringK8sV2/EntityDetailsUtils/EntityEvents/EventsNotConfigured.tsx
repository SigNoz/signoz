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
		<div className={styles.container} data-testid="events-not-configured">
			<div className={styles.content}>
				<img src={emptyStateUrl} alt="not-configured" className={styles.icon} />
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					<span className={styles.title}>No Kubernetes events received yet. </span>
					To view events, enable the k8s events receiver in your OpenTelemetry
					Collector.
				</Typography>

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
					<span className={styles.learnMoreText}>
						<Typography.Link
							/* TODO(typography): a link with no href renders plain text: a click that does not navigate is a Button with variant="link" */ variant="paragraph"
							size="base"
							weight="medium"
							textOverflow="wrap"
						>
							Learn how to configure
						</Typography.Link>
					</span>
					<ArrowRight size={14} />
				</div>
			</div>
		</div>
	);
}
