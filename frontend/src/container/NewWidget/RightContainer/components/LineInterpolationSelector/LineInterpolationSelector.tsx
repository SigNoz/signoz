import { ToggleGroupSimple } from '@signozhq/ui/toggle-group';
import { Typography } from '@signozhq/ui/typography';
import { LineInterpolation } from 'lib/uPlotV2/config/types';

import './LineInterpolationSelector.styles.scss';

interface LineInterpolationSelectorProps {
	value: LineInterpolation;
	onChange: (value: LineInterpolation) => void;
}

export default function LineInterpolationSelector({
	value,
	onChange,
}: LineInterpolationSelectorProps): JSX.Element {
	return (
		<section className="line-interpolation-selector control-container">
			<Typography.Text className="section-heading">
				Line interpolation
			</Typography.Text>
			<ToggleGroupSimple
				type="single"
				value={value}
				size="lg"
				onChange={(newValue: string): void => {
					if (newValue) {
						onChange(newValue as LineInterpolation);
					}
				}}
				items={[
					{
						value: LineInterpolation.Linear,
						'aria-label': 'Linear',
						label: (
							<svg
								className="line-interpolation-icon"
								viewBox="0 0 48 48"
								fill="none"
								stroke="#888"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<circle cx="8" cy="32" r="3" fill="#888" />
								<circle cx="24" cy="16" r="3" fill="#888" />
								<circle cx="40" cy="32" r="3" fill="#888" />
								<path d="M8 32 L24 16 L40 32" stroke="#888" />
							</svg>
						),
					},
					{
						value: LineInterpolation.Spline,
						'aria-label': 'Spline',
						label: (
							<svg
								className="line-interpolation-icon"
								viewBox="0 0 48 48"
								fill="none"
								stroke="#888"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<circle cx="8" cy="32" r="3" fill="#888" />
								<circle cx="24" cy="16" r="3" fill="#888" />
								<circle cx="40" cy="32" r="3" fill="#888" />
								<path d="M8 32 C16 8, 32 8, 40 32" />
							</svg>
						),
					},
					{
						value: LineInterpolation.StepAfter,
						'aria-label': 'Step After',
						label: (
							<svg
								className="line-interpolation-icon"
								viewBox="0 0 48 48"
								fill="none"
								stroke="#888"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<circle cx="8" cy="32" r="3" fill="#888" />
								<circle cx="24" cy="16" r="3" fill="#888" />
								<circle cx="40" cy="32" r="3" fill="#888" />
								<path d="M8 32 V16 H24 V32 H40" />
							</svg>
						),
					},
					{
						value: LineInterpolation.StepBefore,
						'aria-label': 'Step Before',
						label: (
							<svg
								className="line-interpolation-icon"
								viewBox="0 0 48 48"
								fill="none"
								stroke="#888"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<circle cx="8" cy="32" r="3" fill="#888" />
								<circle cx="24" cy="16" r="3" fill="#888" />
								<circle cx="40" cy="32" r="3" fill="#888" />
								<path d="M8 32 H24 V16 H40 V32" />
							</svg>
						),
					},
				]}
			/>
		</section>
	);
}
