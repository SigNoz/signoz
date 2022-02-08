import React, { useEffect, useRef, useState } from 'react';
import { Space } from 'antd';
import { Container, SearchComponent } from './styles';
import useClickOutside from 'hooks/useClickOutside';
import Tags from './AllTags';
import { connect, useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceReducer } from 'types/reducer/trace';
import { ThunkDispatch } from 'redux-thunk';
import AppActions from 'types/actions';
import { bindActionCreators, Dispatch } from 'redux';
import { UpdateTagVisiblity } from 'store/actions/trace/updateTagPanelVisiblity';
import { parseQueryToTags, parseTagsToQuery } from './util';
import { UpdateTagIsError } from 'store/actions/trace/updateIsTagsError';
import { CaretRightFilled } from '@ant-design/icons';
import { updateURL } from 'store/actions/trace/util';
import { UPDATE_ALL_FILTERS } from 'types/actions/trace';

const Search = ({
	updateTagVisiblity,
	updateTagIsError,
}: SearchProps): JSX.Element => {
	const traces = useSelector<AppState, TraceReducer>((state) => state.traces);

	const [value, setValue] = useState<string>('');
	const dispatch = useDispatch<Dispatch<AppActions>>();

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
		if (
			e.nodeName === 'svg' ||
			e.nodeName === 'path' ||
			e.nodeName === 'span' ||
			e.nodeName === 'button'
		) {
			return;
		}

		if (
			e.nodeName === 'DIV' &&
			![
				'ant-select-item-option-content',
				'ant-empty-image',
				'ant-select-item',
				'ant-col',
				'ant-select-item-option-active',
			].find((p) => p.indexOf(e.className) !== -1) &&
			!(e.ariaSelected === 'true') &&
			traces.isTagModalOpen
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

	const updateFilters = async (selectedTags: TraceReducer['selectedTags']) => {
		dispatch({
			type: UPDATE_ALL_FILTERS,
			payload: {
				selectedTags,
				current: traces.spansAggregate.currentPage,
				filter: traces.filter,
				filterToFetchData: traces.filterToFetchData,
				selectedFilter: traces.selectedFilter,
				userSelected: traces.userSelectedFilter,
				isFilterExclude: traces.isFilterExclude,
			},
		});

		updateURL(
			traces.selectedFilter,
			traces.filterToFetchData,
			traces.spansAggregate.currentPage,
			selectedTags,
			traces.filter,
			traces.isFilterExclude,
			traces.userSelectedFilter,
		);
	};

	return (
		<Space direction="vertical" style={{ width: '100%' }}>
			<Container ref={tagRef}>
				<SearchComponent
					onChange={(event) => onChangeHandler(event.target.value)}
					value={value}
					allowClear
					disabled={traces.filterLoading}
					onFocus={onFocusHandler}
					placeholder="Click to filter by tags"
					type={'search'}
					enterButton={<CaretRightFilled />}
					onSearch={(string) => {
						if (string.length === 0) {
							updateTagVisiblity(false);
							updateFilters([]);
							return;
						}

						const { isError, payload } = parseQueryToTags(string);

						if (isError) {
							updateTagIsError(true);
						} else {
							updateTagIsError(false);
							updateTagVisiblity(false);
							updateFilters(payload);
						}
					}}
				/>

				{traces.isTagModalOpen && (
					<Tags updateFilters={updateFilters} onChangeHandler={onChangeHandler} />
				)}
			</Container>
		</Space>
	);
};

interface DispatchProps {
	updateTagVisiblity: (value: boolean) => void;
	updateTagIsError: (value: boolean) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateTagVisiblity: bindActionCreators(UpdateTagVisiblity, dispatch),
	updateTagIsError: bindActionCreators(UpdateTagIsError, dispatch),
});

type SearchProps = DispatchProps;

export default connect(null, mapDispatchToProps)(Search);
