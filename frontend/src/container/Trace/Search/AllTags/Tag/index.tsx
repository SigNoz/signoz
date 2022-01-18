import React, { useState } from 'react';

import { Button, Dropdown, notification, Menu, SelectProps, Spin } from 'antd';
import { Container, SelectComponent } from './styles';
import getTagFilters from 'api/trace/getTagFilter';
import { connect, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';
import { CloseCircleOutlined } from '@ant-design/icons';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { SelectValue } from 'antd/lib/select';
import { ThunkDispatch } from 'redux-thunk';
import AppActions from 'types/actions';
import { bindActionCreators } from 'redux';
import { UpdateSelectedTags } from 'store/actions/trace/updateTagsSelected';

type Tags = FlatArray<TraceReducer['selectedTags'], 1>['selectedFilter'];

const AllMenu: Tags[] = ['IN', 'NOT_IN'];

const SingleTags = (props: AllTagsProps): JSX.Element => {
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const traces = useSelector<AppState, TraceReducer>((state) => state.traces);

	const { selectedTags } = traces;

	const { filters, name, selectedFilter } = selectedTags[props.index];

	const [selectLoading, setSelectLoading] = useState<boolean>(false);

	const [selectedOptions, setSelectedOptions] = useState<
		SelectProps<SelectValue>['options']
	>([]);

	const [
		notificationConfig,
		NotificationElement,
	] = notification.useNotification();

	const AllMenuOptions = AllMenu.map((e) => (
		<Menu.Item
			onClick={(e) => {
				const { key } = e;

				const { updateSelectedTags } = props;
				const current = traces.selectedTags[props.index];

				updateSelectedTags([
					...traces.selectedTags.slice(0, props.index),
					{
						...current,
						selectedFilter: key as Tags,
					},
					...traces.selectedTags.slice(props.index + 1, traces.selectedTags.length),
				]);
			}}
			key={e}
		>
			{e}
		</Menu.Item>
	));

	const onSearchHandler = async (value: string, traces: TraceReducer) => {
		try {
			setSelectLoading(true);
			const response = await getTagFilters({
				start: globalTime.minTime,
				end: globalTime.maxTime,
				other: Object.fromEntries(traces.selectedFilter),
			});

			if (response.statusCode === 200) {
				setSelectedOptions(
					response.payload.map((e) => ({
						value: e.tagKeys,
					})),
				);
			} else {
				notificationConfig.error({
					message: response.error || 'Something went wrong',
				});
			}
			setSelectLoading(false);
		} catch (error) {
			notificationConfig.error({
				message: 'Something went wrong',
			});
			setSelectLoading(false);
		}
	};

	const onSearchDebounceFunction = useDebouncedFn(onSearchHandler, 1000);

	const onSearchChangeHandler: SelectProps<SelectValue>['onChange'] = (
		value,
		options,
	) => {
		const { updateSelectedTags } = props;
		const current = traces.selectedTags[props.index];

		if (current.name.length === 0) {
			updateSelectedTags([
				...traces.selectedTags.slice(0, props.index),
				{
					...current,
					name: options.map((e: { value: string }) => e.value),
				},
				...traces.selectedTags.slice(props.index + 1, traces.selectedTags.length),
			]);
		} else {
			updateSelectedTags([
				...traces.selectedTags.slice(0, props.index),
				{
					...current,
					name: [],
				},
				...traces.selectedTags.slice(props.index + 1, traces.selectedTags.length),
			]);
		}
	};

	return (
		<>
			{NotificationElement}

			<Container>
				<SelectComponent
					onSearch={(value) => {
						onSearchDebounceFunction(value, traces);
					}}
					onChange={onSearchChangeHandler}
					value={name}
					placeholder="Please select"
					mode="multiple"
					options={selectedOptions}
					loading={selectLoading}
					filterOption={false}
					notFoundContent={selectLoading ? <Spin size="small" /> : null}
				/>

				<Dropdown trigger={['hover']} overlay={() => <Menu>{AllMenuOptions}</Menu>}>
					<Button style={{ marginLeft: '1rem', marginRight: '1rem' }}>
						{selectedFilter}
					</Button>
				</Dropdown>

				<SelectComponent
					value={filters}
					onChange={(value) => {
						const { updateSelectedTags } = props;
						const current = traces.selectedTags[props.index];

						updateSelectedTags([
							...traces.selectedTags.slice(0, props.index),
							{
								...current,
								filters: value as string[],
							},
							...traces.selectedTags.slice(
								props.index + 1,
								traces.selectedTags.length,
							),
						]);
					}}
					mode="tags"
				/>

				<Button
					onClick={() => props.onCloseHandler(props.index)}
					style={{ width: '15%', marginLeft: '1rem' }}
					icon={<CloseCircleOutlined />}
				/>
			</Container>
		</>
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

interface AllTagsProps extends DispatchProps {
	onCloseHandler: (index: number) => void;
	index: number;
}

export default connect(null, mapDispatchToProps)(SingleTags);
