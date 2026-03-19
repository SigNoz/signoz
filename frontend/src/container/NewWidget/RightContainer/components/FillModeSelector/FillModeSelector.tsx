import { ToggleGroup, ToggleGroupItem } from '@signozhq/toggle-group';
import { Typography } from 'antd';
import { FillMode } from 'lib/uPlotV2/config/types';

import './FillModeSelector.styles.scss';

interface FillModeSelectorProps {
	value: FillMode;
	onChange: (value: FillMode) => void;
}

export default function FillModeSelector({
	value,
	onChange,
}: FillModeSelectorProps): JSX.Element {
	return (
		<section className="fill-mode-selector control-container">
			<Typography.Text className="section-heading">Fill mode</Typography.Text>
			<ToggleGroup
				type="single"
				value={value}
				variant="outline"
				size="lg"
				onValueChange={(newValue): void => {
					if (newValue) {
						onChange(newValue as FillMode);
					}
				}}
			>
				<ToggleGroupItem value={FillMode.None} aria-label="None" title="None">
					<svg
						className="fill-mode-icon"
						viewBox="0 0 48 48"
						fill="none"
						stroke="#888"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<rect x="8" y="16" width="32" height="16" stroke="#888" fill="none" />
					</svg>
					<Typography.Text className="section-heading-small">None</Typography.Text>
				</ToggleGroupItem>
				<ToggleGroupItem value={FillMode.Solid} aria-label="Solid" title="Solid">
					<svg
						className="fill-mode-icon"
						viewBox="0 0 48 48"
						fill="none"
						stroke="#888"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<rect x="8" y="16" width="32" height="16" fill="#888" />
					</svg>
					<Typography.Text className="section-heading-small">Solid</Typography.Text>
				</ToggleGroupItem>
				<ToggleGroupItem
					value={FillMode.Gradient}
					aria-label="Gradient"
					title="Gradient"
				>
					<svg
						className="fill-mode-icon"
						viewBox="0 0 48 48"
						fill="none"
						stroke="#888"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<defs>
							<linearGradient id="fill-gradient" x1="0" y1="0" x2="1" y2="0">
								<stop offset="0%" stopColor="#888" stopOpacity="0.2" />
								<stop offset="100%" stopColor="#888" stopOpacity="0.8" />
							</linearGradient>
						</defs>
						<rect
							x="8"
							y="16"
							width="32"
							height="16"
							fill="url(#fill-gradient)"
							stroke="#888"
						/>
					</svg>
					<Typography.Text className="section-heading-small">
						Gradient
					</Typography.Text>
				</ToggleGroupItem>
			</ToggleGroup>
		</section>
	);
}
