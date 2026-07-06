import { Pencil, Trash2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import type { DashboardLinkDTO } from 'api/generated/services/sigNoz.schemas';

import styles from './ContextLinksSection.module.scss';

interface ContextLinkListItemProps {
	link: DashboardLinkDTO;
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
				<Typography.Text className={styles.listItemLabel}>{label}</Typography.Text>
				{!!link.url && (
					<Typography.Text className={styles.listItemUrl}>
						{link.url}
					</Typography.Text>
				)}
			</div>
			<div className={styles.listItemActions}>
				<Button
					type="button"
					variant="ghost"
					color="secondary"
					size="icon"
					aria-label={`Edit link ${index + 1}`}
					data-testid={`context-link-edit-${index}`}
					onClick={onEdit}
				>
					<Pencil size={14} />
				</Button>
				<Button
					type="button"
					variant="ghost"
					color="destructive"
					size="icon"
					aria-label={`Remove link ${index + 1}`}
					data-testid={`context-link-remove-${index}`}
					onClick={onRemove}
				>
					<Trash2 size={14} />
				</Button>
			</div>
		</div>
	);
}

export default ContextLinkListItem;
