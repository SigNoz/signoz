import { useEffect, useState } from 'react';
import { Tooltip } from 'antd';
import { Switch } from '@signozhq/ui/switch';
import { Typography } from '@signozhq/ui/typography';
import { Info } from '@signozhq/icons';

import { IAdvancedOptionItemProps } from '../types';
import styles from './styles.module.scss';

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
		<div className={styles.advancedOptionItem} data-testid={dataTestId}>
			<div className={styles.advancedOptionItemLeftContent}>
				<Typography.Text className={styles.advancedOptionItemTitle}>
					{title}
					{tooltipText && (
						<Tooltip title={tooltipText}>
							<Info data-testid="tooltip-icon" size={16} />
						</Tooltip>
					)}
				</Typography.Text>
				<Typography.Text className={styles.advancedOptionItemDescription}>
					{description}
				</Typography.Text>
			</div>
			<div className={styles.advancedOptionItemRightContent}>
				<div
					className={styles.advancedOptionItemInput}
					style={{ display: showInput ? 'block' : 'none' }}
				>
					{input}
				</div>
				<Switch onChange={handleOnToggle} value={showInput} />
			</div>
		</div>
	);
}

export default AdvancedOptionItem;
