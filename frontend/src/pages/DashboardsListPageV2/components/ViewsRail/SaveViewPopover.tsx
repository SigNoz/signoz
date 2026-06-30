import { type ChangeEvent, type ReactNode, useEffect, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { PopoverSimple } from '@signozhq/ui/popover';
import { Typography } from '@signozhq/ui/typography';

import styles from './ViewsRail.module.scss';

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (name: string) => void;
	trigger: ReactNode;
}

function SaveViewPopover({
	open,
	onOpenChange,
	onSave,
	trigger,
}: Props): JSX.Element {
	const [name, setName] = useState('');

	useEffect(() => {
		if (open) {
			setName('');
		}
	}, [open]);

	const canSave = name.trim().length > 0;

	const handleSave = (): void => {
		if (canSave) {
			onSave(name);
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
				<Typography.Text className={styles.saveLabel}>Name</Typography.Text>
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
