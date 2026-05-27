import { Dispatch, SetStateAction } from 'react';
import type { UseQueryResult } from 'react-query';
import { SelectSimple } from '@signozhq/ui/select';
import { Typography } from '@signozhq/ui/typography';
import { Layers } from '@signozhq/icons';
import { SuccessResponse } from 'types/api';
import { LegendPosition } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import SettingsSection from '../../components/SettingsSection/SettingsSection';
import LegendColors from '../../LegendColors/LegendColors';

interface LegendSectionProps {
	allowLegendPosition: boolean;
	allowLegendColors: boolean;
	legendPosition: LegendPosition;
	setLegendPosition: Dispatch<SetStateAction<LegendPosition>>;
	customLegendColors: Record<string, string>;
	setCustomLegendColors: Dispatch<SetStateAction<Record<string, string>>>;
	queryResponse?: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps, unknown>,
		Error
	>;
}

export default function LegendSection({
	allowLegendPosition,
	allowLegendColors,
	legendPosition,
	setLegendPosition,
	customLegendColors,
	setCustomLegendColors,
	queryResponse,
}: LegendSectionProps): JSX.Element {
	return (
		<SettingsSection title="Legend" icon={<Layers size={14} />}>
			{allowLegendPosition && (
				<section className="legend-position control-container">
					<Typography.Text className="section-heading">Position</Typography.Text>
					<SelectSimple
						onChange={(value: string | string[]): void => {
							if (Array.isArray(value)) {
								return;
							}
							setLegendPosition(value as LegendPosition);
						}}
						value={legendPosition}
						className="panel-type-select"
						items={[
							{
								value: LegendPosition.BOTTOM,
								label: (
									<div className="select-option">
										<Typography.Text className="display">Bottom</Typography.Text>
									</div>
								),
							},
							{
								value: LegendPosition.RIGHT,
								label: (
									<div className="select-option">
										<Typography.Text className="display">Right</Typography.Text>
									</div>
								),
							},
						]}
					/>
				</section>
			)}

			{allowLegendColors && (
				<section className="legend-colors">
					<LegendColors
						customLegendColors={customLegendColors}
						setCustomLegendColors={setCustomLegendColors}
						queryResponse={queryResponse}
					/>
				</section>
			)}
		</SettingsSection>
	);
}
