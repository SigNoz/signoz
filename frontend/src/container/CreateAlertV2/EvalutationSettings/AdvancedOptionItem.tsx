import { Switch, Typography } from 'antd';
import { useState } from 'react';

import { IAdvancedOptionItemProps } from './types';

function AdvancedOptionItem({
	title,
	description,
	input,
}: IAdvancedOptionItemProps): JSX.Element {
	const [showInput, setShowInput] = useState<boolean>(false);

	const onToggle = (): void => {
		setShowInput((currentShowInput) => !currentShowInput);
	};

	return (
		<div className="advanced-option-item">
			<div className="advanced-option-item-left-content">
				<Typography.Text className="advanced-option-item-title">
					{title}
				</Typography.Text>
				<Typography.Text className="advanced-option-item-description">
					{description}
				</Typography.Text>
				{showInput && <div className="advanced-option-item-input">{input}</div>}
			</div>
			<div className="advanced-option-item-right-content">
				<Switch onChange={onToggle} />
			</div>
		</div>
	);
}

export default AdvancedOptionItem;
