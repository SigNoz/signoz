import { Typography } from '@signozhq/ui/typography';

import styles from './ConditionsTooltip.module.scss';

interface ConditionsTooltipProps {
	attributes: string[];
	resource: string[];
}

function ConditionsTooltip({
	attributes,
	resource,
}: ConditionsTooltipProps): JSX.Element {
	const hasConditions = attributes.length > 0 || resource.length > 0;

	if (!hasConditions) {
		return (
			<Typography.Text as="span" size="small" color="muted">
				No conditions set up
			</Typography.Text>
		);
	}

	return (
		<div
			className={styles.conditionsTooltip}
			data-testid="group-conditions-tooltip"
		>
			{attributes.length > 0 && (
				<div className={styles.section}>
					<Typography.Text as="span" size="small" color="muted">
						Runs when a span attribute key contains
					</Typography.Text>
					<div className={styles.keyList}>
						{attributes.map((key) => (
							<code key={key} className={styles.key}>
								{key}
							</code>
						))}
					</div>
				</div>
			)}
			{resource.length > 0 && (
				<div className={styles.section}>
					<Typography.Text as="span" size="sm" color="muted">
						{attributes.length > 0 ? 'or when' : 'Runs when'} a resource key contains
					</Typography.Text>
					<div className={styles.keyList}>
						{resource.map((key) => (
							<code key={key} className={styles.key}>
								{key}
							</code>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

export default ConditionsTooltip;
