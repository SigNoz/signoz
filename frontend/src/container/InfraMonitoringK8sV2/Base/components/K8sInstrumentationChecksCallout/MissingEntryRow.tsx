import styles from './MissingEntryRow.module.scss';
import { ExternalLink, TriangleAlert } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import { Divider } from '@signozhq/ui/divider';
import type {
	InframonitoringtypesMissingAttributesComponentEntryDTO,
	InframonitoringtypesMissingMetricsComponentEntryDTO,
} from 'api/generated/services/sigNoz.schemas';

type MissingEntryRowProps =
	| {
			entry: InframonitoringtypesMissingMetricsComponentEntryDTO;
			typeLabel: string;
			itemType: 'metrics';
	  }
	| {
			entry: InframonitoringtypesMissingAttributesComponentEntryDTO;
			typeLabel: string;
			itemType: 'attributes';
	  };

export function MissingEntryRow({
	entry,
	typeLabel,
	itemType,
}: MissingEntryRowProps): JSX.Element {
	const items = itemType === 'metrics' ? entry.metrics : entry.attributes;

	return (
		<div className={styles.entryRow}>
			<TriangleAlert size={14} className={styles.missingIcon} />
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
			{entry.documentationLink && (
				<Typography.Link
					href={entry.documentationLink}
					target="_blank"
					rel="noopener noreferrer"
					size="base"
					className={styles.learnMoreLink}
				>
					Learn here
					<ExternalLink size={12} />
				</Typography.Link>
			)}
			<Divider className={styles.divider} />
		</div>
	);
}
