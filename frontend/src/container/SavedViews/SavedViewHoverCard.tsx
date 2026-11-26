import { Popover } from '@signozhq/ui/popover';
import { SavedViewReadPermission } from 'lib/authz/hooks/useAuthZ/permissions/saved-view.permissions';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

import { SAVED_VIEW_HOVER_CARD_WIDTH } from './constants';
import SavedViewHoverCardDetails from './SavedViewHoverCardDetails';
import { SavedViewHoverCardProps } from './types';

import styles from './SavedViewHoverCard.module.scss';

/**
 * One card for the whole list, shown against whichever row the pointer rests on.
 *
 * Driven by a handle rather than a trigger: the rows carry their own buttons and menu, so making
 * each one a trigger would multiply the popup and swallow those controls into it. The list calls
 * `showAt(rowElement, viewId)` instead, and the card moves to that row and renders that view.
 */
function SavedViewHoverCard({
	handle,
	onCardEnter,
	onCardLeave,
}: SavedViewHoverCardProps): JSX.Element {
	const { allowed: canReadAll } = useAuthZ([SavedViewReadPermission]);

	return (
		<Popover
			side="right"
			align="start"
			handle={handle}
			width={SAVED_VIEW_HOVER_CARD_WIDTH}
			// The card is a preview; the pointer and the keyboard stay where they were.
			initialFocus={false}
			finalFocus={false}
			aria-label="Saved view preview"
		>
			{(viewId: string | undefined): JSX.Element | null =>
				viewId ? (
					<div
						className={styles.content}
						onMouseEnter={onCardEnter}
						onMouseLeave={onCardLeave}
						data-testid="saved-view-hover-card"
					>
						<SavedViewHoverCardDetails viewId={viewId} canReadAll={canReadAll} />
					</div>
				) : null
			}
		</Popover>
	);
}

export default SavedViewHoverCard;
