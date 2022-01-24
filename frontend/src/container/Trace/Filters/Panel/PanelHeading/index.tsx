import React from 'react';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import { Card, Button, Typography, Spin, Divider } from 'antd';

import { Container, IconContainer, TextCotainer } from './styles';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';
const { Text } = Typography;

import { AllPanelHeading } from 'types/reducer/trace';

const PanelHeading = (props: PanelHeadingProps): JSX.Element => {
	const { filterLoading } = useSelector<AppState, TraceReducer>(
		(state) => state.traces,
	);

	const onExpandHandler = () => {
		props.onExpandHandler(props.name);
	};

	return (
		<>
			{props.name !== 'duration' && <Divider plain style={{ margin: 0 }} />}

			<Card bordered={false}>
				<Container
					disabled={filterLoading}
					aria-disabled={filterLoading}
					aria-expanded={props.isOpen}
				>
					<TextCotainer onClick={onExpandHandler}>
						<IconContainer>
							{props.isOpen ? <UpOutlined /> : <DownOutlined />}
						</IconContainer>

						<Text style={{ textTransform: 'capitalize' }} ellipsis>
							{AllPanelHeading.find((e) => e.key === props.name)?.displayValue || ''}
						</Text>

						{filterLoading && <Spin size="small" />}
					</TextCotainer>

					<Button onClick={() => props.onClearAllHandler(props.name)} type="link">
						Clear All
					</Button>
				</Container>
			</Card>
		</>
	);
};

interface PanelHeadingProps {
	onClearAllHandler: (name: TraceFilterEnum) => void;
	onExpandHandler: (name: TraceFilterEnum) => void;
	name: TraceFilterEnum;
	isOpen: boolean;
}

export default PanelHeading;
