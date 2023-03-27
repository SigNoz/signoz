import { EyeFilled, EyeInvisibleFilled } from '@ant-design/icons';
import { ButtonProps } from 'antd';
import React from 'react';

// ** Types
import { ListMarkerProps } from './ListMarker.interfaces';
// ** Styles
import { StyledButton } from './ListMarker.styled';

export function ListMarker({
	isDisabled,
	labelName,
	index,
	isAvailableToDisable,
	className,
	toggleDisabled,
}: ListMarkerProps): JSX.Element {
	const buttonProps: Partial<ButtonProps> = isAvailableToDisable
		? {
				type: isDisabled ? 'default' : 'primary',
				icon: isDisabled ? <EyeInvisibleFilled /> : <EyeFilled />,
				onClick: (): void => toggleDisabled(index),
		  }
		: { type: 'primary' };

	return (
		<StyledButton
			type={buttonProps.type}
			icon={buttonProps.icon}
			onClick={buttonProps.onClick}
			className={className}
		>
			{labelName}
		</StyledButton>
	);
}
