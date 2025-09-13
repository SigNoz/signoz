import { Switch, Typography, Tooltip } from 'antd';
import { HelpCircle } from 'lucide-react';
import { useState } from 'react';

interface IAdvancedOptionItemWithToggleProps {
	title: string;
	description: string;
	tooltipContent?: string;
	input: JSX.Element;
	defaultEnabled?: boolean;
	onToggle?: (enabled: boolean) => void;
}

function AdvancedOptionItemWithToggle({
	title,
	description,
	tooltipContent,
	input,
	defaultEnabled = false,
	onToggle,
}: IAdvancedOptionItemWithToggleProps): JSX.Element {
	const [isEnabled, setIsEnabled] = useState<boolean>(defaultEnabled);

	const handleToggle = (enabled: boolean): void => {
		setIsEnabled(enabled);
		onToggle?.(enabled);
	};

	return (
		<div className="advanced-option-item">
			<div className="advanced-option-item-left-content">
				<div className="advanced-option-item-header">
					<Typography.Text className="advanced-option-item-title">
						{title}
					</Typography.Text>
					{tooltipContent && (
						<Tooltip title={tooltipContent} placement="top">
							<HelpCircle size={14} style={{ color: 'var(--bg-vanilla-400)', cursor: 'help' }} />
						</Tooltip>
					)}
				</div>
				<Typography.Text className="advanced-option-item-description">
					{description}
				</Typography.Text>
			</div>
			<div className="advanced-option-item-right-content">
				{isEnabled && (
					<div className="advanced-option-item-input-inline">
						{input}
					</div>
				)}
				<Switch checked={isEnabled} onChange={handleToggle} />
			</div>
		</div>
	);
}

export default AdvancedOptionItemWithToggle;