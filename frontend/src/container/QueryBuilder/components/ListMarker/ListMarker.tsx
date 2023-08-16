import { EyeFilled, EyeInvisibleFilled } from '@ant-design/icons';
import { ButtonProps } from 'antd';
import { memo } from 'react';

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
				icon: isDisabled ? <EyeInvisibleFilled /> : <EyeFilled />,
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
