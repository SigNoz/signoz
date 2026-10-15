// Driven by a handle, not a trigger: the thing that opens this is the input taking focus, and a
// trigger press would steal that focus and dismiss the popup on every keystroke. The handle
// anchors the suggestions to the input's row while the caret stays where the user put it.
import { ReactNode, useRef, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Popover, usePopoverHandle } from '@signozhq/ui/popover';
import { Typography } from '@signozhq/ui/typography';

import type { VariableItem } from './types';

import styles from './VariablesPopover.module.scss';

interface VariablesPopoverRenderProps {
	setIsOpen: (open: boolean) => void;
	setCursorPosition: (position: number | null) => void;
}

interface VariablesPopoverProps {
	variables: VariableItem[];
	/** Called with the braces-wrapped token (e.g. `{{env}}`) and the tracked cursor offset. */
	onVariableSelect: (token: string, cursorPosition?: number) => void;
	children: (props: VariablesPopoverRenderProps) => ReactNode;
}

/**
 * Autocomplete for context-link variables. Wraps an input (via the render-prop) and
 * shows the available `{{variables}}` grouped by source; picking one inserts it at the
 * tracked cursor. The consumer drives `setIsOpen` (on focus) and `setCursorPosition`.
 */
function VariablesPopover({
	variables,
	onVariableSelect,
	children,
}: VariablesPopoverProps): JSX.Element {
	const [cursorPosition, setCursorPosition] = useState<number | null>(null);
	const anchorRef = useRef<HTMLDivElement>(null);
	const suggestions = usePopoverHandle();

	const setIsOpen = (open: boolean): void => {
		if (!open) {
			suggestions.close();
			return;
		}
		if (anchorRef.current) {
			suggestions.showAt(anchorRef.current);
		}
	};

	return (
		<div className={styles.container}>
			<div className={styles.anchor} ref={anchorRef}>
				{children({ setIsOpen, setCursorPosition })}
			</div>
			<Popover
				nativeButton
				side="bottom"
				align="start"
				handle={suggestions}
				// The caret belongs to the input the suggestions are for, on the way in and out.
				initialFocus={false}
				finalFocus={false}
				// Matches the field it belongs to. Both, because the default max width would
				// otherwise clamp a wide field's suggestions to 25rem.
				width="var(--anchor-width)"
				maxWidth="var(--anchor-width)"
				maxHeight={300}
				aria-label="Insert a variable"
				onOpenChange={(open, eventDetails): void => {
					// Typing, clicking and tabbing inside the input are not dismissals.
					const target = eventDetails.event?.target as Node | null;
					if (!open && target && anchorRef.current?.contains(target)) {
						eventDetails.cancel();
					}
				}}
			>
				<div className={styles.content}>
					{variables.length === 0 ? (
						<div className={styles.empty}>No variables available</div>
					) : (
						variables.map((v) => (
							<span
								key={`${v.source}-${v.name}`}
								className={styles.item}
								onMouseDown={(e): void => e.preventDefault()}
							>
								<Button
									type="button"
									variant="ghost"
									color="secondary"
									size="md"
									width="100%"
									aria-label={`Insert {{${v.name}}}`}
									testId={`context-link-variable-${v.name}`}
									onClick={(): void => {
										onVariableSelect(`{{${v.name}}}`, cursorPosition ?? undefined);
										suggestions.close();
									}}
								>
									<div className={styles.row}>
										<Typography.Text
											className={styles.name}
										>{`{{${v.name}}}`}</Typography.Text>
										<Typography.Text className={styles.source}>
											{v.source}
										</Typography.Text>
									</div>
								</Button>
							</span>
						))
					)}
				</div>
			</Popover>
		</div>
	);
}

export default VariablesPopover;
