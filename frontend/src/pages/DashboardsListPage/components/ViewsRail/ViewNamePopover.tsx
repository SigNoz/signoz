import { type ChangeEvent, type ReactNode, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { Popover, usePopoverHandle } from '@signozhq/ui/popover';
import { Tooltip } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';

import styles from './ViewsRail.module.scss';

export const VIEW_NAME_MAX_LENGTH = 64;

interface Props {
	onSubmit: (name: string) => void;
	/** Called with the opener; wire it to the trigger's `onClick` with the clicked element. */
	trigger: (open: (anchor: HTMLElement) => void) => ReactNode;
	tooltip: string;
	title: string;
	confirmLabel: string;
	initialName?: string;
	testIdPrefix?: string;
}

// Name-input popover shared by "save as view" and "rename view"; enforces the
// view-name length cap in one place.
//
// Handle-driven rather than `trigger`: the trigger carries a Tooltip, and a Tooltip routes every
// prop it does not recognise to its own popup, so a popover's press handlers would never reach
// the button underneath.
function ViewNamePopover({
	onSubmit,
	trigger,
	tooltip,
	title,
	confirmLabel,
	initialName = '',
	testIdPrefix = 'view-name',
}: Props): JSX.Element {
	const [name, setName] = useState(initialName);
	const popover = usePopoverHandle((open) => {
		if (open) {
			setName(initialName);
		}
	});

	const trimmed = name.trim();
	const canSave = trimmed.length > 0 && trimmed.length <= VIEW_NAME_MAX_LENGTH;

	const handleSave = (): void => {
		if (canSave) {
			onSubmit(trimmed);
			popover.close();
		}
	};

	return (
		<>
			<Tooltip title={tooltip}>
				{trigger((anchor) => popover.showAt(anchor))}
			</Tooltip>
			<Popover side="bottom" align="start" handle={popover} aria-label={title}>
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
							onClick={(): void => popover.close()}
						>
							Cancel
						</Button>
						<Button
							disabledTooltip={
								trimmed.length === 0
									? 'Enter a view name first'
									: `Use at most ${VIEW_NAME_MAX_LENGTH} characters`
							}
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
			</Popover>
		</>
	);
}

export default ViewNamePopover;
