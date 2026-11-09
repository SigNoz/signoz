import { useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';
import { PenLine, Trash2 } from '@signozhq/icons';
import cx from 'classnames';
import ViewNamePopover from 'components/ViewNamePopover/ViewNamePopover';

import type { ListViewIcon } from '../types';

import styles from './ViewsRail.module.scss';

interface Props {
	id: string;
	label: string;
	icon: ListViewIcon;
	active: boolean;
	isModified: boolean;
	testIdPrefix: string;
	renameTestIdPrefix: string;
	onSelect: (id: string) => void;
	/** Present only for custom (editable) views. */
	onRename?: (id: string, name: string) => void;
	onDelete?: (id: string, label: string) => void;
}

function ViewsRailItem({
	id,
	label,
	icon: Icon,
	active,
	isModified,
	testIdPrefix,
	renameTestIdPrefix,
	onSelect,
	onRename,
	onDelete,
}: Props): JSX.Element {
	const [renaming, setRenaming] = useState(false);

	return (
		<div className={cx(styles.row, { [styles.rowActive]: active })}>
			<Button
				size="md"
				variant="ghost"
				color="secondary"
				width="100%"
				onClick={(): void => onSelect(id)}
				testId={`${testIdPrefix}-view-${id}`}
				prefix={<Icon size={16} className={styles.itemIcon} />}
				suffix={
					active && isModified ? (
						<div className={styles.dirtyDot} title="Unsaved changes" />
					) : undefined
				}
			>
				{label}
			</Button>
			{onRename && onDelete && (
				<div className={styles.itemActions}>
					<ViewNamePopover
						open={renaming}
						onOpenChange={setRenaming}
						onSubmit={(name): void => onRename(id, name)}
						title="Rename view"
						confirmLabel="Rename"
						initialName={label}
						testIdPrefix={renameTestIdPrefix}
						tooltip="Rename view"
						trigger={
							<Button
								variant="ghost"
								color="secondary"
								size="sm"
								icon
								aria-label="Rename view"
								testId={`${testIdPrefix}-view-rename-${id}`}
								onClick={(e): void => e.stopPropagation()}
							>
								<PenLine size={12} />
							</Button>
						}
					/>
					<Tooltip title="Delete view">
						<Button
							variant="ghost"
							color="secondary"
							size="sm"
							icon
							aria-label="Delete view"
							testId={`${testIdPrefix}-view-delete-${id}`}
							onClick={(e): void => {
								e.stopPropagation();
								onDelete(id, label);
							}}
						>
							<Trash2 size={12} />
						</Button>
					</Tooltip>
				</div>
			)}
		</div>
	);
}

export default ViewsRailItem;
