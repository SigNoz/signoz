import { ToggleGroupSimple } from '@signozhq/ui/toggle-group';
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
			<ToggleGroupSimple
				type="single"
				value={value}
				size="lg"
				onChange={(newValue: string): void => {
					if (newValue) {
						onChange(newValue as LineStyle);
					}
				}}
				items={[
					{
						value: LineStyle.Solid,
						'aria-label': 'Solid',
						label: (
							<>
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
								<Typography.Text className="section-heading-small">
									Solid
								</Typography.Text>
							</>
						),
					},
					{
						value: LineStyle.Dashed,
						'aria-label': 'Dashed',
						label: (
							<>
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
								<Typography.Text className="section-heading-small">
									Dashed
								</Typography.Text>
							</>
						),
					},
				]}
			/>
		</section>
	);
}
