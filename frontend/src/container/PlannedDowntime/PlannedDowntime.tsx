import React, {
	ChangeEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useHistory } from 'react-router-dom';
import { Plus, Search } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';
import { Form } from 'antd';
import {
	useDeleteDowntimeScheduleByID,
	useListDowntimeSchedules,
} from 'api/generated/services/downtimeschedules';
import { useListRules } from 'api/generated/services/rules';
import type { AlertmanagertypesPlannedMaintenanceDTO } from 'api/generated/services/sigNoz.schemas';
import { ColumnSelector } from 'components/TanStackTableView';
import TextToolTip from 'components/TextToolTip';
import dayjs from 'dayjs';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQuery from 'hooks/useUrlQuery';
import { useAppContext } from 'providers/App/App';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { useTimezone } from 'providers/Timezone';
import { USER_ROLES } from 'types/roles';

import 'dayjs/locale/en';

import styles from './PlannedDowntime.module.scss';
import { PlannedDowntimeDeleteModal } from './PlannedDowntimeDeleteModal';
import { PlannedDowntimeForm } from './PlannedDowntimeForm';
import PlannedDowntimeList from './PlannedDowntimeList';
import {
	defaultInitialValues,
	deleteDowntimeHandler,
} from './PlannedDowntimeutils';
import { getPlannedDowntimeColumns } from './table.config';
import { DowntimeSchedulesTableData } from './types';
import usePlannedDowntimeTable from './usePlannedDowntimeTable';

import './PlannedDowntime.styles.scss';

const COLUMNS_STORAGE_KEY = 'planned-downtime-columns';

dayjs.locale('en');

export function PlannedDowntime(): JSX.Element {
	const {
		data: alertsData,
		isError,
		isLoading,
	} = useListRules({
		query: { cacheTime: 0 },
	});
	const [isOpen, setIsOpen] = React.useState(false);
	const [form] = Form.useForm();
	const { user } = useAppContext();
	const { showErrorModal } = useErrorModal();
	const history = useHistory();
	const urlQuery = useUrlQuery();

	const [initialValues, setInitialValues] =
		useState<Partial<AlertmanagertypesPlannedMaintenanceDTO>>(
			defaultInitialValues,
		);

	const downtimeSchedules = useListDowntimeSchedules();
	const alertOptions = React.useMemo(
		() =>
			alertsData?.data?.map((i) => ({
				label: i.alert,
				value: i.id,
			})),
		[alertsData],
	);

	useEffect(() => {
		if (!isOpen) {
			form.resetFields();
		}
	}, [form, isOpen]);

	const [searchValue, setSearchValue] = React.useState<string>(
		urlQuery.get('search') || '',
	);
	const [deleteData, setDeleteData] = useState<{ id: string; name: string }>();
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

	const {
		containerRef,
		calculatedPageSize,
		filteredDowntimes,
		pagedDowntimes,
		setPage,
		setLimit,
	} = usePlannedDowntimeTable(
		downtimeSchedules.data?.data || [],
		alertOptions || [],
		searchValue,
	);

	const handleSearch = (e: ChangeEvent<HTMLInputElement>): void => {
		setSearchValue(e.target.value);
		updateUrlWithSearch(e.target.value);
		setPage(1);
	};

	const clearSearch = (): void => {
		setSearchValue('');
		updateUrlWithSearch('');
		setPage(1);
	};

	const canEdit = user?.role !== USER_ROLES.VIEWER;
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	const columns = React.useMemo(
		() => getPlannedDowntimeColumns(formatTimezoneAdjustedTimestamp),
		[formatTimezoneAdjustedTimestamp],
	);

	const handleCreate = useCallback((): void => {
		setInitialValues(defaultInitialValues);
		setIsOpen(true);
		setEditMode(false);
		form.resetFields();
	}, [form]);

	const handleEdit = useCallback(
		(downtime: DowntimeSchedulesTableData): void => {
			setInitialValues({ ...downtime });
			setIsOpen(true);
			setEditMode(true);
		},
		[],
	);

	const handleDelete = useCallback(
		(downtime: DowntimeSchedulesTableData): void => {
			setDeleteData({ id: downtime.id, name: downtime.name });
			setIsDeleteModalOpen(true);
		},
		[],
	);

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
	} = useDeleteDowntimeScheduleByID();

	const onDeleteHandler = (): void => {
		deleteDowntimeHandler({
			deleteDowntimeScheduleAsync,
			notifications,
			showErrorModal,
			refetchAllSchedules,
			deleteId: deleteData?.id,
			hideDeleteDowntimeScheduleModal,
			clearSearch,
		});
	};

	const isFetching = useMemo(
		() => downtimeSchedules.isLoading || downtimeSchedules.isFetching,
		[downtimeSchedules.isLoading, downtimeSchedules.isFetching],
	);
	const totalDowntimes = useMemo(
		() => downtimeSchedules.data?.data?.length ?? 0,
		[downtimeSchedules.data?.data?.length],
	);
	const isEmpty = useMemo(
		() => !isFetching && !searchValue && totalDowntimes === 0,
		[isFetching, searchValue, totalDowntimes],
	);

	return (
		<div className={styles.container}>
			<header className={styles.headerBand}>
				<div className={styles.commandHeader}>
					<div className={styles.headingBlock}>
						<Typography.Title className={styles.title}>
							Planned Downtime
						</Typography.Title>
						<span className={styles.countPill}>{totalDowntimes}</span>
					</div>
					<div className={styles.grow} />
					{!isEmpty && (
						<ColumnSelector
							columns={columns}
							storageKey={COLUMNS_STORAGE_KEY}
							testId="planned-downtime-columns"
						/>
					)}
					<Button
						variant="solid"
						color="primary"
						size="sm"
						prefix={<Plus size={14} />}
						onClick={handleCreate}
						disabled={!canEdit}
						disabledTooltip="You need edit permissions to create a planned downtime"
						testId="planned-downtime-create"
					>
						New downtime
					</Button>
					<TextToolTip
						text="More details on how to schedule planned downtime"
						url="https://signoz.io/docs/alerts-management/planned-maintenance/"
						urlText="Learn More"
					/>
				</div>

				<div className={styles.filtersRow}>
					<Input
						containerClassName={styles.searchInput}
						placeholder="Search by name"
						value={searchValue}
						onChange={handleSearch}
						suffix={<Search size={14} className={styles.searchIcon} />}
						testId="planned-downtime-search"
					/>
				</div>
			</header>

			<div ref={containerRef} className={styles.tableContainer}>
				<PlannedDowntimeList
					columns={columns}
					downtimes={filteredDowntimes}
					pagedDowntimes={pagedDowntimes}
					calculatedPageSize={calculatedPageSize}
					onLimitChange={setLimit}
					isFetching={isFetching}
					isError={downtimeSchedules.isError}
					refetch={refetchAllSchedules}
					canEdit={canEdit}
					onEdit={handleEdit}
					onDelete={handleDelete}
					onCreate={handleCreate}
					hasSearchTerm={searchValue.length > 0}
					onClearSearch={clearSearch}
				/>
			</div>

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
	);
}
