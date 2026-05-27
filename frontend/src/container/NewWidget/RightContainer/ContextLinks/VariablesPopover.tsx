// Uses Popover (not DropdownMenu like the rest of the antd-dropdown migration):
// DropdownMenuTrigger preventDefaults pointerdown, breaking input focus and
// dismissing on every keystroke. PopoverAnchor is a passive positioning element.
import { ReactNode, useRef, useState } from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '@signozhq/ui/popover';
import { Typography } from '@signozhq/ui/typography';

import './VariablesPopover.styles.scss';

interface VariablesPopoverProps {
	onVariableSelect: (variableName: string, cursorPosition?: number) => void;
	variables: VariableItem[];
	children: (props: {
		onVariableSelect: (variableName: string, cursorPosition?: number) => void;
		isOpen: boolean;
		setIsOpen: (open: boolean) => void;
		cursorPosition: number | null;
		setCursorPosition: (position: number | null) => void;
	}) => ReactNode;
}

interface VariableItem {
	name: string;
	source: string;
}

function VariablesPopover({
	onVariableSelect,
	variables,
	children,
}: VariablesPopoverProps): JSX.Element {
	const [isOpen, setIsOpen] = useState(false);
	const [cursorPosition, setCursorPosition] = useState<number | null>(null);
	const anchorRef = useRef<HTMLDivElement>(null);

	const handleOpenChange = (open: boolean): void => {
		// Accept "close" events from the popover (outside-click, Esc) but ignore
		// opens — opening is driven by the input's onFocus in the consumer.
		if (!open) {
			setIsOpen(false);
		}
	};

	return (
		<div className="variables-popover-container">
			<Popover open={isOpen} onOpenChange={handleOpenChange} modal={false}>
				<PopoverAnchor asChild>
					<div className="variables-popover-anchor-wrap" ref={anchorRef}>
						{children({
							onVariableSelect,
							isOpen,
							setIsOpen,
							cursorPosition,
							setCursorPosition,
						})}
					</div>
				</PopoverAnchor>
				<PopoverContent
					align="start"
					sideOffset={4}
					className="variables-popover-content"
					onOpenAutoFocus={(e): void => e.preventDefault()}
					onCloseAutoFocus={(e): void => e.preventDefault()}
					onInteractOutside={(e): void => {
						// Keep the popover open while interacting with the anchor (the input),
						// otherwise typing/clicking the input would close it immediately.
						const target = e.target as Node | null;
						if (target && anchorRef.current?.contains(target)) {
							e.preventDefault();
						}
					}}
					onFocusOutside={(e): void => {
						const target = e.target as Node | null;
						if (target && anchorRef.current?.contains(target)) {
							e.preventDefault();
						}
					}}
				>
					{variables.length === 0 ? (
						<div className="variables-popover-empty">No variables available</div>
					) : (
						variables.map((v) => (
							<button
								key={v.name}
								type="button"
								className="variables-popover-item"
								onMouseDown={(e): void => {
									// Prevent the input from losing focus when clicking an item.
									e.preventDefault();
								}}
								onClick={(): void => {
									onVariableSelect(`{{${v.name}}}`, cursorPosition || undefined);
									setIsOpen(false);
								}}
							>
								<div className="variable-row">
									<Typography.Text className="variable-name">{`{{${v.name}}}`}</Typography.Text>
									<Typography.Text className="variable-source">
										{v.source}
									</Typography.Text>
								</div>
							</button>
						))
					)}
				</PopoverContent>
			</Popover>
		</div>
	);
}

export default VariablesPopover;
