import { Button, Space, Typography } from 'antd';
import { ReactNode } from 'react';

import { IconContainer, TitleContainer, TitleText } from './styles';

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
				<TitleText>{title}</TitleText>
				<Typography.Text>{subTitle}</Typography.Text>
			</TitleContainer>

			<Button disabled={isDisabled} onClick={onClickHandler} type="primary">
				{buttonText}
			</Button>
		</Space>
	);
}

export interface RowProps {
	onClickHandler: VoidFunction;
	Icon: ReactNode;
	title: string;
	subTitle: string;
	buttonText: string;
	isDisabled: boolean;
}

export default Row;
