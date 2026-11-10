import { Popover, PopoverAnchor, PopoverContent } from '@signozhq/ui/popover';
import { SavedViewReadPermission } from 'lib/authz/hooks/useAuthZ/permissions/saved-view.permissions';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

import SavedViewHoverCardDetails from './SavedViewHoverCardDetails';
import { SavedViewHoverCardProps } from './types';

import styles from './SavedViewHoverCard.module.scss';

function SavedViewHoverCard({
	target,
	onCardEnter,
	onCardLeave,
	onClose,
}: SavedViewHoverCardProps): JSX.Element {
	const { allowed: canReadAll } = useAuthZ([SavedViewReadPermission]);

	return (
		<Popover
			open={!!target}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onClose();
				}
			}}
		>
			<PopoverAnchor asChild>
				<div
					className={styles.anchor}
					style={{ top: target?.anchorTop ?? 0, height: target?.anchorHeight ?? 0 }}
				/>
			</PopoverAnchor>
			<PopoverContent
				side="right"
				align="start"
				sideOffset={4}
				className={styles.card}
				onOpenAutoFocus={(event): void => event.preventDefault()}
				onCloseAutoFocus={(event): void => event.preventDefault()}
			>
				{target && (
					<div
						className={styles.content}
						onMouseEnter={onCardEnter}
						onMouseLeave={onCardLeave}
						data-testid="saved-view-hover-card"
					>
						<SavedViewHoverCardDetails
							viewId={target.viewId}
							canReadAll={canReadAll}
						/>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}

export default SavedViewHoverCard;
