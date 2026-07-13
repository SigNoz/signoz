import { type ChangeEvent, type ReactNode, useEffect, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { PopoverSimple } from '@signozhq/ui/popover';
import { Typography } from '@signozhq/ui/typography';

import styles from './ViewsRail.module.scss';

export const VIEW_NAME_MAX_LENGTH = 64;

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (name: string) => void;
	trigger: ReactNode;
	title: string;
	confirmLabel: string;
	initialName?: string;
	testIdPrefix?: string;
}

// Name-input popover shared by "save as view" and "rename view"; enforces the
// view-name length cap in one place.
function ViewNamePopover({
	open,
	onOpenChange,
	onSubmit,
	trigger,
	title,
	confirmLabel,
	initialName = '',
	testIdPrefix = 'view-name',
}: Props): JSX.Element {
	const [name, setName] = useState(initialName);

	useEffect(() => {
		if (open) {
			setName(initialName);
		}
	}, [open, initialName]);

	const trimmed = name.trim();
	const canSave = trimmed.length > 0 && trimmed.length <= VIEW_NAME_MAX_LENGTH;

	const handleSave = (): void => {
		if (canSave) {
			onSubmit(trimmed);
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
				<div className={styles.saveTitle}>{title}</div>
				<Typography.Text className={styles.saveLabel}>Name</Typography.Text>
				<Input
					value={name}
					autoFocus
					maxLength={VIEW_NAME_MAX_LENGTH}
					placeholder="e.g. Prod alerts"
					testId={`${testIdPrefix}-name`}
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
						testId={`${testIdPrefix}-confirm`}
						onClick={handleSave}
					>
						{confirmLabel}
					</Button>
				</div>
			</div>
		</PopoverSimple>
	);
}

export default ViewNamePopover;
