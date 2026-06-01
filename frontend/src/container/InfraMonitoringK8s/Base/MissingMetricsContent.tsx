import { ReactNode } from 'react';
import { Color } from '@signozhq/design-tokens';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { BookOpenText, ChevronsDown, TriangleAlert } from '@signozhq/icons';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import KeyValueLabel from 'periscope/components/KeyValueLabel';

import styles from './MissingMetricsContent.module.scss';

interface MissingMetricsContentProps {
	missingMetrics: string[];
	title?: string;
	description?: string;
	docsUrl?: string;
	icon?: ReactNode;
}

function MissingMetricsContent({
	missingMetrics,
	title,
	description,
	docsUrl,
	icon,
}: MissingMetricsContentProps): JSX.Element {
	return (
		<section className={styles.missingMetricsContent}>
			<section className={styles.summarySection}>
				<header className={styles.summary}>
					<div className={styles.summaryLeft}>
						<div className={styles.iconWrapper}>
							{icon || <TriangleAlert size={20} color={Color.BG_AMBER_500} />}
						</div>

						<div className={styles.summaryText}>
							<Typography.Title level={5} className={styles.title}>
								{title}
							</Typography.Title>
							<Typography.Text className={styles.description}>
								{description}
							</Typography.Text>
						</div>
					</div>

					{docsUrl && (
						<div className={styles.summaryRight}>
							<Button
								color="secondary"
								className={styles.docsButton}
								data-testid="missing-metrics-docs-button"
								asChild
							>
								<a href={docsUrl} target="_blank" rel="noreferrer">
									<BookOpenText size={14} />
									Open Docs
								</a>
							</Button>
						</div>
					)}
				</header>

				{missingMetrics?.length > 0 && (
					<div className={styles.metricBadge}>
						<KeyValueLabel
							badgeKey={
								<div className={styles.metricBadgeLabel}>
									<div className={styles.metricBadgeLabelDot} />
									<Typography.Text as="div" className={styles.metricBadgeLabelText}>
										METRICS
									</Typography.Text>
								</div>
							}
							badgeValue={missingMetrics.length.toString()}
						/>
						<div className={styles.metricBadgeLine} />
					</div>
				)}
			</section>

			<section className={styles.metricsSection}>
				<div className={styles.metricListContainer}>
					<OverlayScrollbar>
						<ul className={styles.metricList}>
							{missingMetrics?.map((metric) => (
								<li className={styles.metricItem} key={metric}>
									{metric}
								</li>
							))}
						</ul>
					</OverlayScrollbar>
					{missingMetrics?.length > 10 && (
						<div className={styles.scrollHint}>
							<ChevronsDown
								size={16}
								color={Color.BG_VANILLA_100}
								className={styles.scrollHintIcon}
							/>
							<Typography.Text as="span" className={styles.scrollHintText}>
								Scroll for more
							</Typography.Text>
						</div>
					)}
				</div>
			</section>
		</section>
	);
}

MissingMetricsContent.defaultProps = {
	title: 'Missing required metrics',
	description: 'Some required metrics were not found in your data.',
	docsUrl: undefined,
	icon: undefined,
};

export default MissingMetricsContent;
