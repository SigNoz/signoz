import { Dispatch, SetStateAction } from 'react';
import { InputNumber, Select, Typography } from 'antd';
import { Axis3D, LineChart, Spline } from 'lucide-react';

import SettingsSection from '../../components/SettingsSection/SettingsSection';

enum LogScale {
	LINEAR = 'linear',
	LOGARITHMIC = 'logarithmic',
}

const { Option } = Select;

interface AxesSectionProps {
	allowSoftMinMax: boolean;
	allowLogScale: boolean;
	softMin: number | null;
	softMax: number | null;
	setSoftMin: Dispatch<SetStateAction<number | null>>;
	setSoftMax: Dispatch<SetStateAction<number | null>>;
	isLogScale: boolean;
	setIsLogScale: Dispatch<SetStateAction<boolean>>;
}

export default function AxesSection({
	allowSoftMinMax,
	allowLogScale,
	softMin,
	softMax,
	setSoftMin,
	setSoftMax,
	isLogScale,
	setIsLogScale,
}: AxesSectionProps): JSX.Element {
	const softMinHandler = (value: number | null): void => {
		setSoftMin(value);
	};

	const softMaxHandler = (value: number | null): void => {
		setSoftMax(value);
	};

	return (
		<SettingsSection title="Axes" icon={<Axis3D size={14} />}>
			{allowSoftMinMax && (
				<section className="soft-min-max">
					<section className="container">
						<Typography.Text className="text">Soft Min</Typography.Text>
						<InputNumber
							type="number"
							value={softMin}
							onChange={softMinHandler}
							rootClassName="input"
						/>
					</section>
					<section className="container">
						<Typography.Text className="text">Soft Max</Typography.Text>
						<InputNumber
							value={softMax}
							type="number"
							rootClassName="input"
							onChange={softMaxHandler}
						/>
					</section>
				</section>
			)}

			{allowLogScale && (
				<section className="log-scale control-container">
					<Typography.Text className="section-heading">Y Axis Scale</Typography.Text>
					<Select
						onChange={(value): void => setIsLogScale(value === LogScale.LOGARITHMIC)}
						value={isLogScale ? LogScale.LOGARITHMIC : LogScale.LINEAR}
						className="panel-type-select"
						defaultValue={LogScale.LINEAR}
					>
						<Option value={LogScale.LINEAR}>
							<div className="select-option">
								<div className="icon">
									<LineChart size={16} />
								</div>
								<Typography.Text className="display">Linear</Typography.Text>
							</div>
						</Option>
						<Option value={LogScale.LOGARITHMIC}>
							<div className="select-option">
								<div className="icon">
									<Spline size={16} />
								</div>
								<Typography.Text className="display">Logarithmic</Typography.Text>
							</div>
						</Option>
					</Select>
				</section>
			)}
		</SettingsSection>
	);
}
