import { ToggleGroup, ToggleGroupItem } from '@signozhq/ui/toggle-group';
import { Typography } from '@signozhq/ui/typography';
import { LineStyle } from 'lib/uPlotV2/config/types';

import './LineStyleSelector.styles.scss';

interface LineStyleSelectorProps {
	value: LineStyle;
	onChange: (value: LineStyle) => void;
}

export default function LineStyleSelector({
	value,
	onChange,
}: LineStyleSelectorProps): JSX.Element {
	return (
		<section className="line-style-selector control-container">
			<Typography.Text className="section-heading">Line style</Typography.Text>
			<ToggleGroup
				type="single"
				value={value}
				size="lg"
				onChange={(newValue): void => {
					if (newValue) {
						onChange(newValue as LineStyle);
					}
				}}
			>
				<ToggleGroupItem value={LineStyle.Solid} aria-label="Solid">
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
					<Typography.Text className="section-heading-small">Solid</Typography.Text>
				</ToggleGroupItem>
				<ToggleGroupItem value={LineStyle.Dashed} aria-label="Dashed">
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
					<Typography.Text className="section-heading-small">Dashed</Typography.Text>
				</ToggleGroupItem>
			</ToggleGroup>
		</section>
	);
}
