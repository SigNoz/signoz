import React, { useState } from 'react';

import { Tags } from '../index';
import {
	Button,
	Dropdown,
	notification,
	Menu,
	Tag,
	SelectProps,
	Spin,
	Card,
} from 'antd';
import { Container, SelectComponent } from './styles';
import { SelectValue } from 'antd/lib/select';
import { SearchProps } from 'antd/lib/input';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import getTagFilters from 'api/trace/getTagFilter';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';
import { CloseCircleOutlined } from '@ant-design/icons';

const AllMenu: Tags['selectedFilter'][] = ['IN', 'NOT_IN'];

const SingleTags = (props: TagsProps): JSX.Element => {
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const traces = useSelector<AppState, TraceReducer>((state) => state.traces);
	const [selectLoading, setSelectLoading] = useState<boolean>(false);

	const [
		notificationConfig,
		NotificationElement,
	] = notification.useNotification();

	const [selectedFilter, setSelectedFilter] = useState<Tags['selectedFilter']>(
		'IN',
	);

	const [selectedOptions, setSelectedOptions] = useState<
		SelectProps<''>['options']
	>([]);

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

	const onSearchHandler: SearchProps['onSearch'] = async (
		selectValue: SelectValue,
	) => {
		try {
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
		} catch (error) {
			notificationConfig.error({
				message: 'Something went wrong',
			});
		}
	};

	return (
		<>
			{NotificationElement}

			<Container>
				<SelectComponent
					onSearch={useDebouncedFn(onSearchHandler, 500)}
					placeholder="Please select"
					mode="multiple"
					options={selectedOptions}
					loading={selectLoading}
					disabled={selectLoading}
					filterOption={false}
					notFoundContent={selectLoading ? <Spin size="small" /> : null}
				/>

				<Dropdown overlay={() => <Menu>{AllMenuOptions}</Menu>}>
					<Button style={{ marginLeft: '1rem', marginRight: '1rem' }}>
						{selectedFilter}
					</Button>
				</Dropdown>

				<SelectComponent
					tagRender={({ value, closable, onClose, label }) => (
						<Tag
							color={value.toString()}
							onMouseDown={(e) => {
								e.preventDefault();
								e.stopPropagation();
							}}
							closable={closable}
							onClose={onClose}
						>
							{label}
						</Tag>
					)}
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
