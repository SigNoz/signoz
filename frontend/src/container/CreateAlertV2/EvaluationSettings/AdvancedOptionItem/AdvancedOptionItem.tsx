import './styles.scss';

import { Switch, Tooltip, Typography } from 'antd';
import { Info } from 'lucide-react';
import { useState } from 'react';

import { IAdvancedOptionItemProps } from '../types';

function AdvancedOptionItem({
	title,
	description,
	input,
	tooltipText,
	onToggle,
}: IAdvancedOptionItemProps): JSX.Element {
	const [showInput, setShowInput] = useState<boolean>(false);

	const handleOnToggle = (): void => {
		onToggle?.();
		setShowInput((currentShowInput) => !currentShowInput);
	};

	return (
		<div className="advanced-option-item">
			<div className="advanced-option-item-left-content">
				<Typography.Text className="advanced-option-item-title">
					{title}
					{tooltipText && (
						<Tooltip title={tooltipText}>
							<Info size={16} />
						</Tooltip>
					)}
				</Typography.Text>
				<Typography.Text className="advanced-option-item-description">
					{description}
				</Typography.Text>
			</div>
			<div className="advanced-option-item-right-content">
				{showInput && <div className="advanced-option-item-input">{input}</div>}
				<Switch onChange={handleOnToggle} />
			</div>
		</div>
	);
}

export default AdvancedOptionItem;
