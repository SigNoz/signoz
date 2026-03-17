import { Dispatch, SetStateAction } from 'react';
import type { UseQueryResult } from 'react-query';
import { Select, Typography } from 'antd';
import { Layers } from 'lucide-react';
import { SuccessResponse } from 'types/api';
import { LegendPosition } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import SettingsSection from '../../components/SettingsSection/SettingsSection';
import LegendColors from '../../LegendColors/LegendColors';

const { Option } = Select;

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
					<Select
						onChange={(value: LegendPosition): void => setLegendPosition(value)}
						value={legendPosition}
						className="panel-type-select"
						defaultValue={LegendPosition.BOTTOM}
					>
						<Option value={LegendPosition.BOTTOM}>
							<div className="select-option">
								<Typography.Text className="display">Bottom</Typography.Text>
							</div>
						</Option>
						<Option value={LegendPosition.RIGHT}>
							<div className="select-option">
								<Typography.Text className="display">Right</Typography.Text>
							</div>
						</Option>
					</Select>
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
