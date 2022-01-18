import React from 'react';

import { Button, Space, Typography } from 'antd';
import { PlayCircleFilled } from '@ant-design/icons';

import { Container, ButtonContainer, CurrentTagsContainer } from './styles';
import Tags from './Tag';
const { Text } = Typography;
import { PlusCircleOutlined } from '@ant-design/icons';
import { connect, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceReducer } from 'types/reducer/trace';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import AppActions from 'types/actions';
import { UpdateSelectedTags } from 'store/actions/trace/updateTagsSelected';

const AllTags = ({ updateSelectedTags }: AllTagsProps): JSX.Element => {
	const { selectedTags } = useSelector<AppState, TraceReducer>(
		(state) => state.traces,
	);

	const onTagAddHandler = () => {
		updateSelectedTags([
			...selectedTags,
			{
				filters: [],
				name: [],
				selectedFilter: 'IN',
			},
		]);
	};

	const onCloseHandler = (index: number) => {
		updateSelectedTags([
			...selectedTags.slice(0, index),
			...selectedTags.slice(index + 1, selectedTags.length),
		]);
	};

	const onRunQueryHandler = () => {
		console.log('asd');
	};

	const onResetHandler = () => {
		updateSelectedTags([]);
	};

	return (
		<Container>
			<CurrentTagsContainer>
				{selectedTags.map((tags, index) => (
					<Tags
						key={index}
						index={index}
						onCloseHandler={() => onCloseHandler(index)}
					/>
				))}
			</CurrentTagsContainer>

			<Space wrap direction="horizontal">
				<Button onClick={onTagAddHandler} icon={<PlusCircleOutlined />}>
					Add Tags Filter
				</Button>

				<Text ellipsis>
					Results will include spans with ALL the specified tags ( Rows are `anded` )
				</Text>
			</Space>

			<ButtonContainer>
				<Button onClick={onResetHandler}>Reset</Button>
				<Button
					type="primary"
					onClick={onRunQueryHandler}
					icon={<PlayCircleFilled />}
				>
					Run Query
				</Button>
			</ButtonContainer>
		</Container>
	);
};

interface DispatchProps {
	updateSelectedTags: (props: TraceReducer['selectedTags']) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateSelectedTags: bindActionCreators(UpdateSelectedTags, dispatch),
});

type AllTagsProps = DispatchProps;

export default connect(null, mapDispatchToProps)(AllTags);
