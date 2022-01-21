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
import { UpdateTagIsError } from 'store/actions/trace/updateIsTagsError';
import { parseTagsToQuery } from '../util';

const { Paragraph } = Typography;

const AllTags = ({
	updateSelectedTags,
	updateTagIsError,
	onChangeHandler,
}: AllTagsProps): JSX.Element => {
	const { selectedTags, isTagModalError } = useSelector<AppState, TraceReducer>(
		(state) => state.traces,
	);

	const onTagAddHandler = () => {
		updateSelectedTags([
			...selectedTags,
			{
				Key: [],
				Operator: 'IN',
				Values: [],
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
		const parsedQuery = parseTagsToQuery(selectedTags);

		if (parsedQuery.isError) {
			updateTagIsError(true);
		} else {
			onChangeHandler(parsedQuery.payload);
			updateTagIsError(false);
		}
	};

	const onResetHandler = () => {
		updateSelectedTags([]);
	};

	if (isTagModalError) {
		return (
			<Container>
				<Paragraph>
					Unrecognised query format. Please reset your query by clicking `X` in the
					search bar above.
				</Paragraph>

				<Paragraph>
					Please click on the search bar to get a drop down to select relevant tags
				</Paragraph>
			</Container>
		);
	}

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
	updateTagIsError: (value: boolean) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateSelectedTags: bindActionCreators(UpdateSelectedTags, dispatch),
	updateTagIsError: bindActionCreators(UpdateTagIsError, dispatch),
});

interface AllTagsProps extends DispatchProps {
	onChangeHandler: (search: string) => void;
}

export default connect(null, mapDispatchToProps)(AllTags);
