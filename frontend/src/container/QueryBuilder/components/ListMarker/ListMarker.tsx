import { memo } from 'react';
import { EyeClosed, EyeOpen } from '@signozhq/icons';
import { ButtonProps } from 'antd';

// ** Types
import { ListMarkerProps } from './ListMarker.interfaces';
// ** Styles
import { StyledButton } from './ListMarker.styled';

export const ListMarker = memo(function ListMarker({
	isDisabled,
	labelName,
	index,
	isAvailableToDisable = true,
	className,
	onDisable,
	style,
}: ListMarkerProps): JSX.Element {
	const buttonProps: Partial<ButtonProps> = isAvailableToDisable
		? {
				type: isDisabled ? 'default' : 'primary',
				icon: isDisabled ? <EyeClosed size="md" /> : <EyeOpen size="md" />,
				onClick: (): void => onDisable(index),
			}
		: { type: 'primary' };

	return (
		<StyledButton
			type={buttonProps.type}
			icon={buttonProps.icon}
			onClick={buttonProps.onClick}
			className={className}
			$isAvailableToDisable={isAvailableToDisable}
			style={style}
		>
			{labelName}
		</StyledButton>
	);
});
