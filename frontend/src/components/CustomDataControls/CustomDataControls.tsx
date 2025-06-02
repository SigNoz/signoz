import './CustomDataControls.styles.scss';

import { Card, InputNumber, Switch, Typography } from 'antd';
import { Widgets } from 'types/api/dashboard/getAll';

interface CustomDataControlsProps {
	widget: Widgets;
	onUpdate: (updatedWidget: Partial<Widgets>) => void;
}

const { Text } = Typography;

function CustomDataControls({
	widget,
	onUpdate,
}: CustomDataControlsProps): JSX.Element {
	const handleCustomDataModeChange = (checked: boolean): void => {
		onUpdate({
			customDataMode: checked,
			customXData: checked ? widget.customXData || 15 : undefined,
			customYData: checked ? widget.customYData || 4 : undefined,
		});
	};

	const handleDataPointsChange = (value: number | null): void => {
		if (value !== null && value > 0) {
			onUpdate({ customXData: value });
		}
	};

	const handleSeriesCountChange = (value: number | null): void => {
		if (value !== null && value > 0) {
			onUpdate({ customYData: value });
		}
	};

	return (
		<Card className="custom-data-controls" size="small">
			<div className="custom-data-header">
				<Text strong>Custom Data Generator</Text>
				<Switch
					checked={widget.customDataMode || false}
					onChange={handleCustomDataModeChange}
					size="small"
				/>
			</div>

			{widget.customDataMode && (
				<div className="custom-data-inputs">
					<div className="input-group">
						<Text className="input-label">Data Points (X):</Text>
						<InputNumber
							value={widget.customXData || 15}
							onChange={handleDataPointsChange}
							size="small"
							style={{ width: 80 }}
						/>
					</div>

					<div className="input-group">
						<Text className="input-label">Series Count (Y):</Text>
						<InputNumber
							value={widget.customYData || 4}
							onChange={handleSeriesCountChange}
							size="small"
							style={{ width: 80 }}
						/>
					</div>
				</div>
			)}
		</Card>
	);
}

export default CustomDataControls;
