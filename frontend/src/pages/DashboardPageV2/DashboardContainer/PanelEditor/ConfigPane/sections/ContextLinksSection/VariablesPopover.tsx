// Uses Popover (not DropdownMenu): DropdownMenuTrigger preventDefaults pointerdown,
// which steals input focus and dismisses on every keystroke. PopoverAnchor is a passive
// positioning element that leaves the wrapped input fully interactive.
import { ReactNode, useRef, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '@signozhq/ui/popover';
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
	const [isOpen, setIsOpen] = useState(false);
	const [cursorPosition, setCursorPosition] = useState<number | null>(null);
	const anchorRef = useRef<HTMLDivElement>(null);

	const handleOpenChange = (open: boolean): void => {
		// Accept "close" events (outside-click, Esc) but ignore opens — opening is driven
		// by the input's onFocus in the consumer.
		if (!open) {
			setIsOpen(false);
		}
	};

	// Keep the popover open while the pointer/focus is inside the anchored input.
	const keepOpenIfInsideAnchor = (event: {
		target: EventTarget | null;
	}): void => {
		const target = event.target as Node | null;
		if (
			target &&
			anchorRef.current?.contains(target) &&
			'preventDefault' in event
		) {
			(event as Event).preventDefault();
		}
	};

	return (
		<div className={styles.container}>
			<Popover open={isOpen} onOpenChange={handleOpenChange} modal={false}>
				<PopoverAnchor asChild>
					<div className={styles.anchor} ref={anchorRef}>
						{children({ setIsOpen, setCursorPosition })}
					</div>
				</PopoverAnchor>
				<PopoverContent
					align="start"
					sideOffset={4}
					// Render inside the anchor (not a body portal): the editor lives in a modal
					// DialogWrapper, and radix's modal sets pointer-events:none on everything
					// portalled outside it, which would make the suggestions unclickable.
					withPortal={false}
					className={styles.content}
					onOpenAutoFocus={(e): void => e.preventDefault()}
					onCloseAutoFocus={(e): void => e.preventDefault()}
					onInteractOutside={keepOpenIfInsideAnchor}
					onFocusOutside={keepOpenIfInsideAnchor}
				>
					{variables.length === 0 ? (
						<div className={styles.empty}>No variables available</div>
					) : (
						variables.map((v) => (
							<Button
								key={`${v.source}-${v.name}`}
								type="button"
								variant="ghost"
								color="secondary"
								size="md"
								className={styles.item}
								aria-label={`Insert {{${v.name}}}`}
								testId={`context-link-variable-${v.name}`}
								// Prevent the input from losing focus when clicking an item.
								onMouseDown={(e): void => e.preventDefault()}
								onClick={(): void => {
									onVariableSelect(`{{${v.name}}}`, cursorPosition ?? undefined);
									setIsOpen(false);
								}}
							>
								<div className={styles.row}>
									<Typography.Text
										className={styles.name}
									>{`{{${v.name}}}`}</Typography.Text>
									<Typography.Text className={styles.source}>{v.source}</Typography.Text>
								</div>
							</Button>
						))
					)}
				</PopoverContent>
			</Popover>
		</div>
	);
}

export default VariablesPopover;
