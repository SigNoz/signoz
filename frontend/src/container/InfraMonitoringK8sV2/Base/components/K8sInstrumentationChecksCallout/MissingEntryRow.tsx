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
				/* TODO(typography): italic has no equivalent */ variant="paragraph"
				size="base"
				weight="regular"
				color="secondary"
				as="span"
				textOverflow="wrap"
			>
				{entry.associatedComponent.name}
			</Typography>
			{entry.documentationLink && (
				<Typography.Link
					variant="paragraph"
					size="base"
					weight="regular"
					display="inline-flex"
					gap={4}
					marginLeft={2}
					textOverflow="wrap"
					href={entry.documentationLink}
					target="_blank"
				>
					Learn here
					<ExternalLink size={12} />
				</Typography.Link>
			)}
			<Divider />
		</div>
	);
}
