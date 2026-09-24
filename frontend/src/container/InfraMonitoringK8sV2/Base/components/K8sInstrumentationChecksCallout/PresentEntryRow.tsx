import styles from './PresentEntryRow.module.scss';
import { CircleCheck } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import { Divider } from '@signozhq/ui/divider';
import type {
	InframonitoringtypesAttributesComponentEntryDTO,
	InframonitoringtypesMetricsComponentEntryDTO,
} from 'api/generated/services/sigNoz.schemas';

type PresentEntryRowProps =
	| {
			entry: InframonitoringtypesMetricsComponentEntryDTO;
			typeLabel: string;
			itemType: 'metrics';
	  }
	| {
			entry: InframonitoringtypesAttributesComponentEntryDTO;
			typeLabel: string;
			itemType: 'attributes';
	  };

export function PresentEntryRow({
	entry,
	typeLabel,
	itemType,
}: PresentEntryRowProps): JSX.Element {
	const items = itemType === 'metrics' ? entry.metrics : entry.attributes;

	return (
		<div className={styles.entryRow}>
			<CircleCheck size={14} className={styles.presentIcon} />
			<Typography.Text size="base" weight="medium">
				{typeLabel}
			</Typography.Text>
			<Typography.Text size="base" color="muted">
				-
			</Typography.Text>
			<Typography.Text
				size="base"
				weight="semibold"
				className={styles.entryRowMetric}
			>
				{items?.join(', ')}
			</Typography.Text>
			<Typography.Text size="base" color="muted">
				-
			</Typography.Text>
			<Typography.Text size="base" italic color="muted">
				{entry.associatedComponent.name}
			</Typography.Text>
			<Divider className={styles.divider} />
		</div>
	);
}
