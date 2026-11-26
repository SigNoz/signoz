import { Typography } from '@signozhq/ui/typography';
import { ArrowRight } from '@signozhq/icons';

import emptyStateUrl from '@/assets/Icons/emptyState.svg';

import styles from './EventsNotConfigured.module.scss';

const K8S_EVENTS_DOCS_URL =
	'https://signoz.io/docs/infrastructure-monitoring/k8s-metrics/';

export default function EventsNotConfigured(): JSX.Element {
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

				<Typography.Link
					variant="paragraph"
					size="base"
					weight="medium"
					display="inline-flex"
					gap={4}
					marginTop={8}
					textOverflow="wrap"
					href={K8S_EVENTS_DOCS_URL}
					target="_blank"
					testId="events-not-configured-docs-link"
				>
					Learn how to configure
					<ArrowRight size={14} />
				</Typography.Link>
			</div>
		</div>
	);
}
