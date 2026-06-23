import { type ChangeEvent, type ReactNode, useEffect, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { PopoverSimple } from '@signozhq/ui/popover';
import cx from 'classnames';

import { VIEW_ICON_OPTIONS } from '../../views';

import styles from './ViewsRail.module.scss';

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (name: string, icon: string) => void;
	trigger: ReactNode;
}

const DEFAULT_ICON = VIEW_ICON_OPTIONS[0].name;

function SaveViewPopover({
	open,
	onOpenChange,
	onSave,
	trigger,
}: Props): JSX.Element {
	const [name, setName] = useState('');
	const [icon, setIcon] = useState(DEFAULT_ICON);

	useEffect(() => {
		if (open) {
			setName('');
			setIcon(DEFAULT_ICON);
		}
	}, [open]);

	const canSave = name.trim().length > 0;

	const handleSave = (): void => {
		if (canSave) {
			onSave(name, icon);
			onOpenChange(false);
		}
	};

	return (
		<PopoverSimple
			open={open}
			onOpenChange={onOpenChange}
			align="start"
			trigger={trigger}
		>
			<div className={styles.savePopover}>
				<div className={styles.saveTitle}>Save as view</div>
				<span className={styles.saveLabel}>Name</span>
				<Input
					value={name}
					autoFocus
					placeholder="e.g. Prod alerts"
					testId="save-view-name"
					onChange={(e: ChangeEvent<HTMLInputElement>): void =>
						setName(e.target.value)
					}
					onKeyDown={(e): void => {
						if (e.key === 'Enter') {
							handleSave();
						}
					}}
				/>
				<span className={styles.saveLabel}>Icon</span>
				<div className={styles.iconGrid}>
					{VIEW_ICON_OPTIONS.map(({ name: iconName, Icon }) => (
						<button
							key={iconName}
							type="button"
							aria-label={iconName}
							className={cx(styles.iconCell, {
								[styles.iconCellOn]: icon === iconName,
							})}
							onClick={(): void => setIcon(iconName)}
						>
							<Icon size={14} />
						</button>
					))}
				</div>
				<div className={styles.saveActions}>
					<Button
						variant="ghost"
						color="secondary"
						size="sm"
						onClick={(): void => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						variant="solid"
						color="primary"
						size="sm"
						disabled={!canSave}
						testId="save-view-confirm"
						onClick={handleSave}
					>
						Save view
					</Button>
				</div>
			</div>
		</PopoverSimple>
	);
}

export default SaveViewPopover;
