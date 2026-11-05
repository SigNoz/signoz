import cx from 'classnames';
import { Undo2 } from '@signozhq/icons';

import SavedViewsRowButton from './SavedViewsRowButton';
import SavedViewsRowLink from './SavedViewsRowLink';
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
	return (
		<div
			className={cx(styles.row, { [styles.isActive]: isActive })}
			data-testid="saved-views-row"
			data-view-id={view.id}
			onMouseEnter={(event): void =>
				hover.onRowEnter(view.id, event.currentTarget)
			}
			onMouseLeave={hover.onRowLeave}
		>
			<SavedViewsRowLink view={view} isActive={isActive} onSelect={onSelect} />
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
