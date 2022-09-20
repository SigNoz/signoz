import { Button, Typography } from 'antd';
import React from 'react';

import { Container, TitleContainer } from './styles';

function Row(props: RowProps): JSX.Element {
	const { onClickHandler, Icon, buttonText, subTitle, title } = props;

	return (
		<Container onClick={onClickHandler}>
			<div>{Icon}</div>
			<TitleContainer>
				<Typography>{title}</Typography>
				<Typography.Text italic>{subTitle}</Typography.Text>
			</TitleContainer>
			<Button type="primary">{buttonText}</Button>
		</Container>
	);
}

export interface RowProps {
	onClickHandler: VoidFunction;
	Icon: React.ReactNode;
	title: string;
	subTitle: string;
	buttonText: string;
}

export default Row;
