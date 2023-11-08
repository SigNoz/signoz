import './ThresholdSelector.styles.scss';

import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Card, Divider, InputNumber, Select, Space, Typography } from 'antd';

import { formatOptions, unitOptions, valueSelect } from '../constants';
import ColorSelector from './ColorSelector';

function Threshold(): JSX.Element {
	return (
		<div className="threahold-selector-container">
			<Typography.Text>Thresholds</Typography.Text>
			<Card className="threahold-selector-card">
				<div className="threshold-card-container">
					<div className="threshold-action-button">
						<EditOutlined className="threshold-action-icon" />
						<Divider type="vertical" />
						<DeleteOutlined className="threshold-action-icon" />
					</div>
					<div>
						<Space>
							<Typography.Text>If value is</Typography.Text>
							<Select
								style={{ width: '73px' }}
								defaultValue={valueSelect[0]?.value}
								options={valueSelect}
							/>
						</Space>
					</div>
					<div className="threshold-units-selector">
						<InputNumber min={1} max={10} defaultValue={3} />
						<Select
							style={{ width: '200px' }}
							defaultValue={unitOptions[0]?.value}
							options={unitOptions}
						/>
					</div>
					<div>
						<Space direction="vertical">
							<Typography.Text>Show with</Typography.Text>
							<Space>
								<ColorSelector />
								<Select
									style={{ width: '100px' }}
									defaultValue={formatOptions[0]?.label}
									options={formatOptions}
								/>
							</Space>
						</Space>
					</div>
				</div>
			</Card>
		</div>
	);
}

export default Threshold;
