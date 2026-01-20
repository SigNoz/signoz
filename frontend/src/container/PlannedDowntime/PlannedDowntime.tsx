import './PlannedDowntime.styles.scss';
import 'dayjs/locale/en';

import { PlusOutlined } from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import { Button, Flex, Form, Input, Tooltip, Typography } from 'antd';
import getAll from 'api/alerts/getAll';
import { useDeleteDowntimeSchedule } from 'api/plannedDowntime/deleteDowntimeSchedule';
import {
	DowntimeSchedules,
	useGetAllDowntimeSchedules,
} from 'api/plannedDowntime/getAllDowntimeSchedules';
import dayjs from 'dayjs';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQuery from 'hooks/useUrlQuery';
import { Search } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import React, { ChangeEvent, useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useHistory } from 'react-router-dom';
import { USER_ROLES } from 'types/roles';

import { PlannedDowntimeDeleteModal } from './PlannedDowntimeDeleteModal';
import { PlannedDowntimeForm } from './PlannedDowntimeForm';
import { PlannedDowntimeList } from './PlannedDowntimeList';
import {
	defautlInitialValues,
	deleteDowntimeHandler,
} from './PlannedDowntimeutils';

dayjs.locale('en');

export function PlannedDowntime(): JSX.Element {
	const { data, isError, isLoading } = useQuery('allAlerts', {
		queryFn: getAll,
		cacheTime: 0,
	});
	const [isOpen, setIsOpen] = React.useState(false);
	const [form] = Form.useForm();
	const { user } = useAppContext();
	const history = useHistory();
	const urlQuery = useUrlQuery();

	const [initialValues, setInitialValues] = useState<
		Partial<DowntimeSchedules & { editMode: boolean }>
	>(defautlInitialValues);

	const downtimeSchedules = useGetAllDowntimeSchedules();
	const alertOptions = React.useMemo(
		() =>
			data?.payload?.map((i) => ({
				label: i.alert,
				value: i.id,
			})),
		[data],
	);

	useEffect(() => {
		if (!isOpen) {
			form.resetFields();
		}
	}, [form, isOpen]);

	const [searchValue, setSearchValue] = React.useState<string | number>(
		urlQuery.get('search') || '',
	);
	const [deleteData, setDeleteData] = useState<{ id: number; name: string }>();
	const [isEditMode, setEditMode] = useState<boolean>(false);

	const updateUrlWithSearch = useDebouncedFn((value) => {
		const searchValue = value as string;
		if (searchValue) {
			urlQuery.set('search', searchValue);
		} else {
			urlQuery.delete('search');
		}
		const url = `/alerts?${urlQuery.toString()}`;
		history.replace(url);
	}, 300);

	const handleSearch = (e: ChangeEvent<HTMLInputElement>): void => {
		setSearchValue(e.target.value);
		updateUrlWithSearch(e.target.value);
	};

	const clearSearch = (): void => {
		setSearchValue('');
		updateUrlWithSearch('');
	};

	// Delete Downtime Schedule
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const { notifications } = useNotifications();

	const hideDeleteDowntimeScheduleModal = (): void => {
		setIsDeleteModalOpen(false);
	};

	const refetchAllSchedules = (): void => {
		downtimeSchedules.refetch();
	};

	const {
		mutateAsync: deleteDowntimeScheduleAsync,
		isLoading: isDeleteLoading,
	} = useDeleteDowntimeSchedule({ id: deleteData?.id });

	const onDeleteHandler = (): void => {
		deleteDowntimeHandler({
			deleteDowntimeScheduleAsync,
			notifications,
			refetchAllSchedules,
			deleteId: deleteData?.id,
			hideDeleteDowntimeScheduleModal,
			clearSearch,
		});
	};

	return (
		<div className="planned-downtime-container">
			<div className="planned-downtime-content">
				<Typography.Title className="title">Planned Downtime</Typography.Title>
				<Typography.Text className="subtitle">
					Create and manage planned downtimes.
				</Typography.Text>
				<Flex className="toolbar">
					<Input
						placeholder="Search for a planned downtime..."
						prefix={<Search size={12} color={Color.BG_VANILLA_400} />}
						value={searchValue}
						onChange={handleSearch}
					/>
					<Tooltip
						title={
							user?.role === USER_ROLES.VIEWER
								? 'You need edit permissions to create a planned downtime'
								: ''
						}
					>
						<Button
							icon={<PlusOutlined />}
							type="primary"
							onClick={(): void => {
								setInitialValues({ ...defautlInitialValues, editMode: false });
								setIsOpen(true);
								setEditMode(false);
								form.resetFields();
							}}
							disabled={user?.role === USER_ROLES.VIEWER}
						>
							New downtime
						</Button>
					</Tooltip>
				</Flex>
				<br />
				<PlannedDowntimeList
					downtimeSchedules={downtimeSchedules}
					alertOptions={alertOptions || []}
					setInitialValues={setInitialValues}
					setModalOpen={setIsOpen}
					handleDeleteDowntime={(id, name): void => {
						setDeleteData({ id, name });
						setIsDeleteModalOpen(true);
					}}
					setEditMode={setEditMode}
					searchValue={searchValue}
				/>
				{isOpen && (
					<PlannedDowntimeForm
						alertOptions={alertOptions || []}
						initialValues={initialValues}
						isError={isError}
						isLoading={isLoading}
						isOpen={isOpen}
						setIsOpen={setIsOpen}
						refetchAllSchedules={refetchAllSchedules}
						isEditMode={isEditMode}
						form={form}
					/>
				)}
				<PlannedDowntimeDeleteModal
					isDeleteLoading={isDeleteLoading}
					isDeleteModalOpen={isDeleteModalOpen}
					onDeleteHandler={onDeleteHandler}
					setIsDeleteModalOpen={setIsDeleteModalOpen}
					downtimeSchedule={deleteData?.name || ''}
				/>
			</div>
		</div>
	);
}
