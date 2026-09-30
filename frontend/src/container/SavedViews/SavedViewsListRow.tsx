import cx from 'classnames';
import { Undo2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';

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

	return (
		<div
			className={cx(styles.row, { [styles.isActive]: isActive })}
			data-testid="saved-views-row"
			data-view-id={view.id}
			onMouseEnter={(event): void => hover.onRowEnter(view, event.currentTarget)}
			onMouseLeave={hover.onRowLeave}
		>
			<Button
				variant="ghost"
				color="secondary"
				className={styles.rowName}
				onClick={(): void => {
					if (!isActive) {
						onSelect(view);
					}
				}}
				data-testid="saved-views-row-name"
			>
				<span className={styles.rowNameText}>{name}</span>
			</Button>
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
					onAction={(key): void => onAction(view, key)}
					onOpen={hover.onMenuOpen}
				/>
			</span>
		</div>
	);
}

export default SavedViewsListRow;
