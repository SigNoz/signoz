import { useEffect, useState } from 'react';
import { Tooltip } from 'antd';
import { Switch } from '@signozhq/ui/switch';
import { Typography } from '@signozhq/ui/typography';
import { Info } from '@signozhq/icons';

import { IAdvancedOptionItemProps } from '../types';

import './styles.scss';

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
				<Typography
					variant="paragraph"
					size="base"
					weight="medium"
					color="secondary"
					as="p"
					display="flex"
					gap={4}
					textOverflow="wrap"
				>
					{title}
					{tooltipText && (
						<Tooltip title={tooltipText}>
							<Info data-testid="tooltip-icon" size={16} />
						</Tooltip>
					)}
				</Typography>
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="secondary"
					as="span"
					textOverflow="wrap"
				>
					{description}
				</Typography>
			</div>
			<div className="advanced-option-item-right-content">
				<div
					className="advanced-option-item-input"
					style={{ display: showInput ? 'block' : 'none' }}
				>
					{input}
				</div>
				<Switch
					color="primary"
					textPlacement="right"
					onChange={handleOnToggle}
					value={showInput}
				/>
			</div>
		</div>
	);
}

export default AdvancedOptionItem;
