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
			<Typography
				variant="paragraph"
				size="base"
				weight="medium"
				color="inherit"
				as="span"
				textOverflow="wrap"
			>
				{typeLabel}
			</Typography>
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="secondary"
				as="span"
				textOverflow="wrap"
			>
				-
			</Typography>
			<Typography
				variant="paragraph"
				size="base"
				weight="bold"
				color="inherit"
				as="span"
				textOverflow="wrap"
			>
				{items?.join(', ')}
			</Typography>
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="secondary"
				as="span"
				textOverflow="wrap"
			>
				-
			</Typography>
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="secondary"
				as="span"
				textOverflow="wrap"
			>
				{entry.associatedComponent.name}
			</Typography>
			<Divider />
		</div>
	);
}
