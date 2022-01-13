import React, { useState } from 'react';
import { CaretDownFilled, CaretUpFilled } from '@ant-design/icons';
import { Card, Button, Typography } from 'antd';

import { Container, IconContainer, TextCotainer } from './styles';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';
const { Text } = Typography;

const PanelHeading = (props: PanelHeadingProps): JSX.Element => {
	const { filterLoading, filterToFetchData } = useSelector<
		AppState,
		TraceReducer
	>((state) => state.traces);

	const onExpandHandler = () => {
		props.onExpandHandler(props.name);
	};

	return (
		<Card>
			<Container
				disabled={filterLoading}
				aria-disabled={filterLoading}
				aria-expanded={props.isOpen}
			>
				<TextCotainer onClick={onExpandHandler}>
					<IconContainer>
						{props.isOpen ? <CaretUpFilled /> : <CaretDownFilled />}
					</IconContainer>

					<Text style={{ textTransform: 'capitalize' }} ellipsis>
						{props.name}
					</Text>
				</TextCotainer>

				<Button onClick={() => props.onClearAllHandler(props.name)} type="link">
					Clear All
				</Button>
			</Container>
		</Card>
	);
};

interface PanelHeadingProps {
	onClearAllHandler: (name: TraceFilterEnum) => void;
	onExpandHandler: (name: TraceFilterEnum) => void;
	name: TraceFilterEnum;
	isOpen: boolean;
}

export default PanelHeading;
