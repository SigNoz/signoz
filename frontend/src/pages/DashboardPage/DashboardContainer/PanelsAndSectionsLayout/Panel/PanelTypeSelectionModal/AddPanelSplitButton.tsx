import { useRef } from 'react';
import { Check, ChevronUp, Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@signozhq/ui/dropdown-menu';
import { TooltipSimple } from '@signozhq/ui/tooltip';

import type { SectionOption } from './types';

import styles from './AddPanelSplitButton.module.scss';

interface AddPanelSplitButtonProps {
	label: string;
	options: SectionOption[];
	value: string | null;
	onChange: (value: string) => void;
	onCreate: () => void;
	onConfirm: () => void;
	disabled: boolean;
}

function AddPanelSplitButton({
	label,
	options,
	value,
	onChange,
	onCreate,
	onConfirm,
	disabled,
}: AddPanelSplitButtonProps): JSX.Element {
	const createOnCloseRef = useRef(false);

	return (
		<div className={styles.splitButton}>
			<TooltipSimple title={label} delayDuration={1000}>
				<Button
					color="primary"
					size="md"
					className={styles.main}
					onClick={onConfirm}
					disabled={disabled}
					data-testid="panel-type-confirm"
				>
					<span className={styles.ellipsis}>{label}</span>
				</Button>
			</TooltipSimple>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						color="primary"
						size="icon"
						className={styles.toggle}
						aria-label="Choose section"
					>
						<ChevronUp size={16} />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					side="top"
					align="end"
					sideOffset={6}
					className={styles.menu}
					// Mounted after close, so the name input's autofocus isn't undone.
					onCloseAutoFocus={(e): void => {
						if (createOnCloseRef.current) {
							createOnCloseRef.current = false;
							e.preventDefault();
							onCreate();
						}
					}}
				>
					<DropdownMenuLabel className={styles.menuLabel}>
						Add to section
					</DropdownMenuLabel>
					{options.map((option) => (
						<DropdownMenuItem
							key={option.value}
							onSelect={(): void => onChange(option.value)}
							rightIcon={
								option.value === value ? (
									<Check size={14} className={styles.check} />
								) : undefined
							}
							title={option.label}
							testId={`panel-section-option-${option.value}`}
						>
							<span className={styles.ellipsis}>{option.label}</span>
						</DropdownMenuItem>
					))}
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className={styles.createOption}
						leftIcon={<Plus size={14} />}
						onSelect={(): void => {
							createOnCloseRef.current = true;
						}}
						testId="panel-section-create"
					>
						New section
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

export default AddPanelSplitButton;
