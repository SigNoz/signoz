import './styles.scss';

import { Switch, Tooltip, Typography } from 'antd';
import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';

import { IAdvancedOptionItemProps } from '../types';

function AdvancedOptionItem({
	title,
	description,
	input,
	tooltipText,
	onToggle,
	defaultShowInput,
	'data-testid': dataTestId,
}: IAdvancedOptionItemProps): JSX.Element {
	const [showInput, setShowInput] = useState<boolean>(false);

	useEffect(() => {
		setShowInput(defaultShowInput);
	}, [defaultShowInput]);

	const handleOnToggle = (): void => {
		onToggle?.();
		setShowInput((currentShowInput) => !currentShowInput);
	};

	return (
		<div className="advanced-option-item" data-testid={dataTestId}>
			<div className="advanced-option-item-left-content">
				<Typography.Text className="advanced-option-item-title">
					{title}
					{tooltipText && (
						<Tooltip title={tooltipText}>
							<Info data-testid="tooltip-icon" size={16} />
						</Tooltip>
					)}
				</Typography.Text>
				<Typography.Text className="advanced-option-item-description">
					{description}
				</Typography.Text>
			</div>
			<div className="advanced-option-item-right-content">
				<div
					className="advanced-option-item-input"
					style={{ display: showInput ? 'block' : 'none' }}
				>
					{input}
				</div>
				<Switch onChange={handleOnToggle} checked={showInput} />
			</div>
		</div>
	);
}

export default AdvancedOptionItem;
