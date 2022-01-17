import React, { useState } from 'react';

import { Tags } from '../index';
import { Button, Dropdown, notification, Menu, SelectProps, Spin } from 'antd';
import { Container, SelectComponent } from './styles';
import getTagFilters from 'api/trace/getTagFilter';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';
import { CloseCircleOutlined } from '@ant-design/icons';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { SelectValue } from 'antd/lib/select';

const AllMenu: Tags['selectedFilter'][] = ['IN', 'NOT_IN'];

const SingleTags = (props: TagsProps): JSX.Element => {
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const traces = useSelector<AppState, TraceReducer>((state) => state.traces);
	const [selectLoading, setSelectLoading] = useState<boolean>(false);
	const [searchValue, setSearchValue] = useState<string[]>([]);

	const [selectedValue, setSelectValue] = useState<string[]>([]);
	const [selectedFilter, setSelectedFilter] = useState<Tags['selectedFilter']>(
		'IN',
	);

	const [selectedOptions, setSelectedOptions] = useState<
		SelectProps<SelectValue>['options']
	>([]);

	console.log({ searchValue, selectedValue, selectedFilter });

	const [
		notificationConfig,
		NotificationElement,
	] = notification.useNotification();

	const AllMenuOptions = AllMenu.map((e) => (
		<Menu.Item
			onClick={() => {
				setSelectedFilter(e);
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
		if (searchValue.length === 0) {
			setSearchValue(options.map((e) => e.value) as string[]);
		} else {
			setSearchValue([]);
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
					value={searchValue}
					placeholder="Please select"
					mode="multiple"
					options={selectedOptions}
					loading={selectLoading}
					filterOption={false}
					notFoundContent={selectLoading ? <Spin size="small" /> : null}
				/>

				<Dropdown overlay={() => <Menu>{AllMenuOptions}</Menu>}>
					<Button style={{ marginLeft: '1rem', marginRight: '1rem' }}>
						{selectedFilter}
					</Button>
				</Dropdown>

				<SelectComponent
					value={selectedValue}
					onChange={(value) => {
						setSelectValue(() => [...(value as string[])]);
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

interface TagsProps extends Tags {
	onCloseHandler: (index: number) => void;
	index: number;
}

export default SingleTags;
