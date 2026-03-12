import { ToggleGroup, ToggleGroupItem } from '@signozhq/toggle-group';
import { Typography } from 'antd';
import { LineStyle } from 'lib/uPlotV2/config/types';

import './LineStyleSelector.styles.scss';

interface LineStyleSelectorProps {
	value: LineStyle;
	onChange: (value: LineStyle) => void;
}

export function LineStyleSelector({
	value,
	onChange,
}: LineStyleSelectorProps): JSX.Element {
	return (
		<section className="line-style-selector control-container">
			<Typography.Text className="line-style-label">Line style</Typography.Text>
			<ToggleGroup
				type="single"
				value={value}
				variant="outline"
				size="lg"
				onValueChange={(newValue): void => {
					if (newValue) {
						onChange(newValue as LineStyle);
					}
				}}
			>
				<ToggleGroupItem value={LineStyle.Solid} aria-label="Solid" title="Solid">
					<svg
						className="line-style-icon"
						viewBox="0 0 48 48"
						fill="none"
						stroke="#888"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M8 24 L40 24" />
					</svg>
					Solid
				</ToggleGroupItem>
				<ToggleGroupItem
					value={LineStyle.Dashed}
					aria-label="Dashed"
					title="Dashed"
				>
					<svg
						className="line-style-icon"
						viewBox="0 0 48 48"
						fill="none"
						stroke="#888"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeDasharray="6 4"
					>
						<path d="M8 24 L40 24" />
					</svg>
					Dashed
				</ToggleGroupItem>
			</ToggleGroup>
		</section>
	);
}
