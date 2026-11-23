import { Typography } from '@signozhq/ui/typography';

import { ConditionKey } from 'container/LLMObservability/AttributeMapping/types';

import styles from './ConditionsTooltip.module.scss';

interface ConditionsTooltipProps {
	attributes: ConditionKey[];
	resource: ConditionKey[];
}

function ConditionsTooltip({
	attributes,
	resource,
}: ConditionsTooltipProps): JSX.Element {
	const hasConditions = attributes.length > 0 || resource.length > 0;

	if (!hasConditions) {
		return (
			<Typography
				variant="paragraph"
				size="small"
				weight="regular"
				color="secondary"
				as="span"
				textOverflow="wrap"
			>
				No conditions set up
			</Typography>
		);
	}

	return (
		<div
			className={styles.conditionsTooltip}
			data-testid="group-conditions-tooltip"
		>
			{attributes.length > 0 && (
				<div className={styles.section}>
					<Typography
						variant="paragraph"
						size="small"
						weight="regular"
						color="secondary"
						as="span"
						textOverflow="wrap"
					>
						Runs when a span attribute key contains
					</Typography>
					<div className={styles.keyList}>
						{attributes.map((key) => (
							<code key={`${key.origin}-${key.value}`} className={styles.key}>
								{key.value}
							</code>
						))}
					</div>
				</div>
			)}
			{resource.length > 0 && (
				<div className={styles.section}>
					<Typography
						variant="paragraph"
						size="small"
						weight="regular"
						color="secondary"
						as="span"
						textOverflow="wrap"
					>
						{attributes.length > 0 ? 'or when' : 'Runs when'} a resource key contains
					</Typography>
					<div className={styles.keyList}>
						{resource.map((key) => (
							<code key={`${key.origin}-${key.value}`} className={styles.key}>
								{key.value}
							</code>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

export default ConditionsTooltip;
