import { ReactElement } from 'react';
import { Dock, PanelBottom, PanelRight } from '@signozhq/icons';
import { ToggleGroup } from '@signozhq/ui/toggle-group';

import { SpanDetailVariant } from './constants';

interface DockOption {
	value: SpanDetailVariant;
	icon: ReactElement;
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
}

function DockModeSwitcher({
	value,
	onChange,
}: DockModeSwitcherProps): JSX.Element {
	return (
		<ToggleGroup
			type="single"
			variant="outlined"
			color="secondary"
			size="sm"
			value={value}
			onChange={(next): void => {
				if (next) {
					onChange(next as SpanDetailVariant);
				}
			}}
			items={DOCK_OPTIONS.map((option) => ({
				value: option.value,
				testId: `dock-mode-${option.value}`,
				// No per-item tooltip. The copy stays the accessible name; the icon stays the visible control.
				label: (
					<span style={{ display: 'inline-flex', alignItems: 'center' }}>
						{option.icon}
						<span
							style={{
								display: 'inline-block',
								inlineSize: 0,
								blockSize: 0,
								overflow: 'hidden',
							}}
						>
							{option.tooltip}
						</span>
					</span>
				),
			}))}
		/>
	);
}

export default DockModeSwitcher;
