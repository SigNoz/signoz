import { ReactNode } from 'react';
import { Dock, PanelBottom, PanelRight } from '@signozhq/icons';
import { ToggleGroup, ToggleGroupItem } from '@signozhq/ui/toggle-group';
import {
	TooltipContent,
	TooltipProvider,
	TooltipRoot,
	TooltipTrigger,
} from '@signozhq/ui/tooltip';

import { SpanDetailVariant } from './constants';

interface DockOption {
	value: SpanDetailVariant;
	icon: ReactNode;
	tooltip: string;
}

const DOCK_OPTIONS: DockOption[] = [
	{
		value: SpanDetailVariant.DIALOG,
		icon: <Dock size={14} />,
		tooltip: 'Open as floating panel',
	},
	{
		value: SpanDetailVariant.DOCKED,
		icon: <PanelBottom size={14} />,
		tooltip: 'Dock at the bottom',
	},
	{
		value: SpanDetailVariant.DOCKED_RIGHT,
		icon: <PanelRight size={14} />,
		tooltip: 'Dock on the right',
	},
];

interface DockModeSwitcherProps {
	value: SpanDetailVariant;
	onChange: (value: SpanDetailVariant) => void;
	tooltipClassName?: string;
}

function DockModeSwitcher({
	value,
	onChange,
	tooltipClassName,
}: DockModeSwitcherProps): JSX.Element {
	return (
		<TooltipProvider>
			<ToggleGroup
				type="single"
				value={value}
				onChange={(v): void => {
					if (v) {
						onChange(v as SpanDetailVariant);
					}
				}}
				size="sm"
			>
				{DOCK_OPTIONS.map((option) => (
					<TooltipRoot key={option.value}>
						<TooltipTrigger asChild>
							<span data-testid={`dock-mode-${option.value}`}>
								<ToggleGroupItem value={option.value}>{option.icon}</ToggleGroupItem>
							</span>
						</TooltipTrigger>
						<TooltipContent className={tooltipClassName}>
							{option.tooltip}
						</TooltipContent>
					</TooltipRoot>
				))}
			</ToggleGroup>
		</TooltipProvider>
	);
}

export default DockModeSwitcher;
