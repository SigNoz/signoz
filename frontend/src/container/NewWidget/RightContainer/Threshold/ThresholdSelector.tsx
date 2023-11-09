import './ThresholdSelector.styles.scss';

import { CheckOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Card, Divider, InputNumber, Select, Space, Typography } from 'antd';
import { useState } from 'react';

import { formatOptions, operatorOptions, unitOptions } from '../constants';
import ColorSelector from './ColorSelector';

function Threshold({
	thresholdOperator,
	isEditEnabled = false,
}: ThresholdProps): JSX.Element {
	const [isEditMode, setIsEditMode] = useState<boolean>(isEditEnabled);
	const [operator, setOperator] = useState<string | number>(
		thresholdOperator as string | number,
	);

	const toggleEditMode = (): void => {
		setIsEditMode(!isEditMode);
	};

	const handleOperatorChange = (value: string | number): void => {
		setOperator(value);
	};

	return (
		<div className="threahold-selector-container">
			<Typography.Text>Thresholds</Typography.Text>
			<Card className="threahold-selector-card">
				<div className="threshold-card-container">
					<div className="threshold-action-button">
						{isEditMode ? (
							<CheckOutlined onClick={toggleEditMode} />
						) : (
							<EditOutlined
								className="threshold-action-icon"
								onClick={toggleEditMode}
							/>
						)}
						<Divider type="vertical" />
						<DeleteOutlined className="threshold-action-icon" />
					</div>
					<div>
						<Space>
							<Typography.Text>If value is</Typography.Text>
							<Select
								style={{ width: '73px' }}
								defaultValue={operator}
								options={operatorOptions}
								onChange={handleOperatorChange}
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

type ThresholdOperators = '>' | '<' | '>=' | '<=';

type ThresholdProps = {
	thresholdOperator?: ThresholdOperators;
	isEditEnabled?: boolean;
};

Threshold.defaultProps = {
	thresholdOperator: '>',
	isEditEnabled: false,
};

export default Threshold;
