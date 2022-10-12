import { Button, Space, Typography } from 'antd';
import React from 'react';

import { IconContainer, TitleContainer } from './styles';

function Row({
	onClickHandler,
	Icon,
	buttonText,
	subTitle,
	title,
	isDisabled,
}: RowProps): JSX.Element {
	return (
		<Space style={{ justifyContent: 'space-between', width: '100%' }}>
			<IconContainer>{Icon}</IconContainer>

			<TitleContainer>
				<Typography>{title}</Typography>
				<Typography.Text italic>{subTitle}</Typography.Text>
			</TitleContainer>

			<Button disabled={isDisabled} onClick={onClickHandler} type="primary">
				{buttonText}
			</Button>
		</Space>
	);
}

export interface RowProps {
	onClickHandler: VoidFunction;
	Icon: React.ReactNode;
	title: string;
	subTitle: string;
	buttonText: string;
	isDisabled: boolean;
}

export default Row;
