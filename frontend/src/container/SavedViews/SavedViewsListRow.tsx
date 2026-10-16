import cx from 'classnames';
import { Undo2 } from '@signozhq/icons';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import { buildSavedViewReadPermission } from 'lib/authz/hooks/useAuthZ/permissions/saved-view.permissions';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

import SavedViewsRowButton from './SavedViewsRowButton';
import SavedViewsRowMenu from './SavedViewsRowMenu';
import { SavedViewsListRowProps } from './types';

import styles from './SavedViewsList.module.scss';

function SavedViewsListRow({
	view,
	isActive,
	onSelect,
	onClear,
	onAction,
	hover,
}: SavedViewsListRowProps): JSX.Element {
	const name = view.spec.displayName;
	const readPermission = buildSavedViewReadPermission(view.id);
	// Same cached check as the button; gates the hover card.
	const { isLoading, deniedPermissions } = useAuthZ([readPermission]);
	const canRead = !isLoading && deniedPermissions.length === 0;

	return (
		<div
			className={cx(styles.row, { [styles.isActive]: isActive })}
			data-testid="saved-views-row"
			data-view-id={view.id}
			onMouseEnter={(event): void => {
				if (canRead) {
					hover.onRowEnter(view, event.currentTarget);
				}
			}}
			onMouseLeave={hover.onRowLeave}
		>
			<div className={styles.rowName}>
				<AuthZButton
					checks={[readPermission]}
					size="md"
					variant="ghost"
					color="secondary"
					width="100%"
					textOverflow="ellipsis"
					onClick={(): void => {
						if (!isActive) {
							onSelect(view);
						}
					}}
					testId="saved-views-row-name"
				>
					{name}
				</AuthZButton>
			</div>
			{isActive && (
				<SavedViewsRowButton
					icon={<Undo2 size={14} />}
					label="Clear view"
					tooltip="Clear view"
					onClick={onClear}
					testId="saved-views-row-clear"
				/>
			)}
			<span className={styles.rowMenu}>
				<SavedViewsRowMenu
					viewId={view.id}
					onAction={(key): void => onAction(view, key)}
					onOpen={hover.onMenuOpen}
				/>
			</span>
		</div>
	);
}

export default SavedViewsListRow;
