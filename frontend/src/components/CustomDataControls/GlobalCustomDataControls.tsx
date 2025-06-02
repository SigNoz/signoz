import './CustomDataControls.styles.scss';

import { Card, InputNumber, Switch, Typography } from 'antd';

interface GlobalCustomDataControlsProps {
	customDataMode: boolean;
	setCustomDataMode: (value: boolean) => void;
	customXData: number;
	setCustomXData: (value: number) => void;
	customYData: number;
	setCustomYData: (value: number) => void;
}

const { Text } = Typography;

function GlobalCustomDataControls({
	customDataMode,
	setCustomDataMode,
	customXData,
	setCustomXData,
	customYData,
	setCustomYData,
}: GlobalCustomDataControlsProps): JSX.Element {
	const handleCustomDataModeChange = (checked: boolean): void => {
		setCustomDataMode(checked);

		// Set default values if not already set
		if (checked) {
			if (!customXData) setCustomXData(15);
			if (!customYData) setCustomYData(4);
		}
	};

	const handleDataPointsChange = (value: number | null): void => {
		if (value !== null && value > 0) {
			setCustomXData(value);
		}
	};

	const handleSeriesCountChange = (value: number | null): void => {
		if (value !== null && value > 0) {
			setCustomYData(value);
		}
	};

	return (
		<Card
			className="custom-data-controls global-custom-data-controls"
			size="small"
		>
			<div className="custom-data-header">
				<Text strong>Global Custom Data Generator</Text>
				<Switch
					checked={customDataMode}
					onChange={handleCustomDataModeChange}
					size="small"
				/>
			</div>

			{customDataMode && (
				<div className="custom-data-inputs">
					<div className="input-group">
						<Text className="input-label">Data Points (X):</Text>
						<InputNumber
							value={customXData || 15}
							onChange={handleDataPointsChange}
							size="small"
							style={{ width: 80 }}
							min={1}
							max={1000}
						/>
					</div>

					<div className="input-group">
						<Text className="input-label">Series Count (Y):</Text>
						<InputNumber
							value={customYData || 4}
							onChange={handleSeriesCountChange}
							size="small"
							style={{ width: 80 }}
							min={1}
							max={20}
						/>
					</div>
				</div>
			)}
		</Card>
	);
}

export default GlobalCustomDataControls;
