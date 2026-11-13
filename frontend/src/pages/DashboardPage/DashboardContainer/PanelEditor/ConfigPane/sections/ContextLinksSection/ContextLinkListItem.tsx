import { Pencil, Trash2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import type { DashboardtypesLinkDTO } from 'api/generated/services/sigNoz.schemas';

import styles from './ContextLinksSection.module.scss';

interface ContextLinkListItemProps {
	link: DashboardtypesLinkDTO;
	index: number;
	onEdit: () => void;
	onRemove: () => void;
}

/** A saved context link in the section list: its label + URL, with edit / delete actions. */
function ContextLinkListItem({
	link,
	index,
	onEdit,
	onRemove,
}: ContextLinkListItemProps): JSX.Element {
	const label = link.name?.trim() || link.url || 'Untitled link';

	return (
		<div className={styles.listItem} data-testid={`context-link-item-${index}`}>
			<div className={styles.listItemText}>
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="main"
					as="span"
					display="inline-block"
					maxWidth="100%"
					textOverflow="ellipsis"
				>
					{label}
				</Typography>
				{!!link.url && (
					<Typography
						variant="code"
						size="small"
						weight="regular"
						color="secondary"
						as="span"
						display="inline-block"
						maxWidth="100%"
						textOverflow="ellipsis"
					>
						{link.url}
					</Typography>
				)}
			</div>
			<div className={styles.listItemActions}>
				<Button
					type="button"
					variant="ghost"
					color="secondary"
					size="sm"
					icon
					aria-label={`Edit link ${index + 1}`}
					testId={`context-link-edit-${index}`}
					onClick={onEdit}
				>
					<Pencil size={14} />
				</Button>
				<Button
					type="button"
					variant="solid"
					color="danger"
					size="sm"
					icon
					aria-label={`Remove link ${index + 1}`}
					testId={`context-link-remove-${index}`}
					onClick={onRemove}
				>
					<Trash2 size={14} />
				</Button>
			</div>
		</div>
	);
}

export default ContextLinkListItem;
