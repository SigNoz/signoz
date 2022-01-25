import React, { useEffect, useRef, useState } from 'react';
import { Space, Input } from 'antd';
import { Container, SearchComponent } from './styles';
import useClickOutside from 'hooks/useClickOutside';
import Tags from './AllTags';
import { connect, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceReducer } from 'types/reducer/trace';
import { ThunkDispatch } from 'redux-thunk';
import AppActions from 'types/actions';
import { bindActionCreators } from 'redux';
import { UpdateTagVisiblity } from 'store/actions/trace/updateTagPanelVisiblity';
import { parseQueryToTags, parseTagsToQuery } from './util';
import { UpdateSelectedTags } from 'store/actions/trace/updateTagsSelected';
import { UpdateTagIsError } from 'store/actions/trace/updateIsTagsError';
import { CaretRightFilled } from '@ant-design/icons';
import { updateURL } from 'store/actions/trace/util';

const Search = ({
	updateTagVisiblity,
	updateSelectedTags,
	updateTagIsError,
}: SearchProps): JSX.Element => {
	const traces = useSelector<AppState, TraceReducer>((state) => state.traces);

	const [value, setValue] = useState<string>('');

	useEffect(() => {
		if (traces.filterLoading) {
			const initialTags = parseTagsToQuery(traces.selectedTags);
			if (!initialTags.isError) {
				setValue(initialTags.payload);
			}
		}
	}, [traces.selectedTags, traces.filterLoading]);

	useEffect(() => {
		if (value.length === 0 && traces.isTagModalError) {
			updateTagIsError(false);
		}
	}, [traces.isTagModalError, value]);

	const tagRef = useRef<HTMLDivElement>(null);

	useClickOutside(tagRef, (e: HTMLElement) => {
		// using this hack as overlay span is voilating this condition
		const getClassCondition = (e: HTMLElement) => {
			if (e.nodeName === 'SPAN') {
				return 'ant-dropdown-menu-title-content';
			}

			if (e.nodeName === 'DIV') {
				return 'ant-select-item-option-content';
			}

			if (e.nodeName === 'BUTTON') {
				return 'ant-btn ant-btn-icon-only';
			}
		};

		if (
			e.nodeName === 'svg' ||
			e.nodeName === 'path' ||
			e.nodeName === 'span' ||
			e.nodeName === 'button'
		) {
			return;
		}

		const classCondition = getClassCondition(e);

		if (
			(e.nodeName !== 'SPAN' && e.className !== classCondition) ||
			(e.nodeName !== 'DIV' && e.className !== classCondition) ||
			(e.nodeName !== 'BUTTON' && e.className !== classCondition)
		) {
			updateTagVisiblity(false);
		}
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

	return (
		<Space direction="vertical" style={{ width: '100%' }}>
			<Container ref={tagRef}>
				<SearchComponent
					onChange={(event) => onChangeHandler(event.target.value)}
					value={value}
					allowClear
					onFocus={onFocusHandler}
					placeholder="Click to filter by tags"
					type={'search'}
					enterButton={<CaretRightFilled />}
					onSearch={(string) => {
						if (string.length === 0) {
							updateURL(
								traces.selectedFilter,
								traces.filterToFetchData,
								traces.spansAggregate.currentPage,
								[],
							);
							return;
						}

						const { isError, payload } = parseQueryToTags(string);

						if (isError) {
							updateTagIsError(true);
						} else {
							updateTagIsError(false);
							updateURL(
								traces.selectedFilter,
								traces.filterToFetchData,
								traces.spansAggregate.currentPage,
								payload,
							);
						}
					}}
				/>

				{traces.isTagModalOpen && <Tags onChangeHandler={onChangeHandler} />}
			</Container>
		</Space>
	);
};

interface DispatchProps {
	updateTagVisiblity: (value: boolean) => void;
	updateSelectedTags: (props: TraceReducer['selectedTags']) => void;
	updateTagIsError: (value: boolean) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateTagVisiblity: bindActionCreators(UpdateTagVisiblity, dispatch),
	updateSelectedTags: bindActionCreators(UpdateSelectedTags, dispatch),
	updateTagIsError: bindActionCreators(UpdateTagIsError, dispatch),
});

type SearchProps = DispatchProps;

export default connect(null, mapDispatchToProps)(Search);
