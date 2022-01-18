import React, { useRef, useState } from 'react';
import { Space, Input, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Container } from './styles';
import useClickOutside from 'hooks/useClickOutside';
import Tags from './AllTags';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceReducer } from 'types/reducer/trace';
import { ThunkDispatch } from 'redux-thunk';
import AppActions from 'types/actions';
import { bindActionCreators } from 'redux';
import { UpdateTagVisiblity } from 'store/actions/trace/updateTagPanelVisisblity';

const Search = ({ updateTagVisiblity }: SearchProps): JSX.Element => {
	const [value, setValue] = useState<string>();
	const { isTagModalOpen } = useSelector<AppState, TraceReducer>(
		(state) => state.traces,
	);

	const tagRef = useRef<HTMLDivElement>(null);

	useClickOutside(tagRef, () => {
		console.log('asd');
	});

	const onChangeHandler = (search: string) => {
		setValue(search);
	};

	const setIsTagsModalHandler = (value: boolean) => {
		updateTagVisiblity(value);
	};

	const onFocusHandler: React.FocusEventHandler<HTMLInputElement> = (e) => {
		e.preventDefault();
		setIsTagsModalHandler(true);
	};

	const onParseQueryToTagsHandler = () => {
		console.log('asd');
	};

	return (
		<Space direction="vertical" style={{ width: '100%' }}>
			<Container ref={tagRef}>
				<Input
					onChange={(event) => onChangeHandler(event.target.value)}
					value={value}
					onFocus={onFocusHandler}
					placeholder="Click to filter by tags"
				/>

				<Button onClick={onParseQueryToTagsHandler} type="primary">
					<SearchOutlined />
				</Button>

				{isTagModalOpen && <Tags />}
			</Container>
		</Space>
	);
};

interface DispatchProps {
	updateTagVisiblity: (value: boolean) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateTagVisiblity: bindActionCreators(UpdateTagVisiblity, dispatch),
});

type SearchProps = DispatchProps;

export default Search;
