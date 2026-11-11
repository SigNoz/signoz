import React, {
	ChangeEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { useAppLocation } from 'lib/router/useAppLocation';
import { navigate } from 'lib/router/navigation';
import { Plus, Search } from '@signozhq/icons';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';
import { Form, Skeleton } from 'antd';
import {
	useDeleteDowntimeScheduleByID,
	useListDowntimeSchedules,
} from 'api/generated/services/downtimeschedules';
import type { AlertmanagertypesPlannedMaintenanceDTO } from 'api/generated/services/sigNoz.schemas';
import { ColumnSelector } from 'components/TanStackTableView';
import TextToolTip from 'components/TextToolTip';
import dayjs from 'dayjs';
import { useListAllRules } from 'hooks/alerts/useListAllRules';
import {
	PLANNED_MAINTENANCE_CREATE_CHECKS,
	PLANNED_MAINTENANCE_LIST_CHECKS,
	usePlannedMaintenanceCollectionPermissions,
} from 'hooks/plannedDowntime/usePlannedMaintenanceCollectionPermissions';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQuery from 'hooks/useUrlQuery';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import { AuthZGuardContent } from 'lib/authz/components/AuthZGuard/AuthZGuardContent';
import PermissionDeniedCallout from 'lib/authz/components/PermissionDeniedCallout/PermissionDeniedCallout';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { useTimezone } from 'providers/Timezone';

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
		isFetching: isFetchingAlerts,
	} = useListAllRules({ cacheTime: 0 });
	const [isOpen, setIsOpen] = React.useState(false);
	const [form] = Form.useForm();
	const { showErrorModal } = useErrorModal();
	const location = useAppLocation();
	const urlQuery = useUrlQuery();

	const [initialValues, setInitialValues] =
		useState<Partial<AlertmanagertypesPlannedMaintenanceDTO>>(
			defaultInitialValues,
		);

	const downtimeSchedules = useListDowntimeSchedules();
	const alertOptions = React.useMemo(
		() =>
			alertsData?.map((i) => ({
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

	const [searchValue, setSearchValue] = React.useState<string>(() => {
		const searchFromUrlQuery = urlQuery.get('search');
		if (searchFromUrlQuery) {
			return searchFromUrlQuery;
		}
		const search =
			(typeof window !== 'undefined' && window.location.search) ||
			location.search ||
			'';
		return new URLSearchParams(search).get('search') || '';
	});
	const [deleteData, setDeleteData] = useState<{ id: string; name: string }>();
	const [isEditMode, setEditMode] = useState<boolean>(false);

	const updateUrlWithSearch = useDebouncedFn((value) => {
		const nextSearch = value as string;
		const search =
			(typeof window !== 'undefined' && window.location.search) || location.search;
		const params = new URLSearchParams(search);
		if (nextSearch) {
			params.set('search', nextSearch);
		} else {
			params.delete('search');
		}
		const url = `/alerts?${params.toString()}`;
		navigate(url, { replace: true });
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

	const { canList } = usePlannedMaintenanceCollectionPermissions();
	const { formatTimezoneAdjustedTimestamp } = useTimezone();
	const isAlertsLoading = isLoading || (!alertsData && isFetchingAlerts);
	const columns = React.useMemo(
		() =>
			getPlannedDowntimeColumns(formatTimezoneAdjustedTimestamp, isAlertsLoading),
		[formatTimezoneAdjustedTimestamp, isAlertsLoading],
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
		void downtimeSchedules.refetch();
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
							All planned downtimes
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
					<AuthZButton
						checks={PLANNED_MAINTENANCE_CREATE_CHECKS}
						variant="solid"
						color="primary"
						size="sm"
						prefix={<Plus size={14} />}
						onClick={handleCreate}
						testId="planned-downtime-create"
					>
						New Downtime
					</AuthZButton>
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
						disabled={!canList}
						suffix={<Search size={14} className={styles.searchIcon} />}
						testId="planned-downtime-search"
					/>
				</div>
			</header>

			<div ref={containerRef} className={styles.tableContainer}>
				<AuthZGuardContent
					checks={PLANNED_MAINTENANCE_LIST_CHECKS}
					fallback={({ deniedPermissions }): JSX.Element => (
						<PermissionDeniedCallout
							deniedPermissions={deniedPermissions}
							className={styles.guardInset}
						/>
					)}
					fallbackOnLoading={
						<div className={styles.guardInset}>
							<Skeleton active paragraph={{ rows: 6 }} />
						</div>
					}
				>
					<PlannedDowntimeList
						columns={columns}
						downtimes={filteredDowntimes}
						pagedDowntimes={pagedDowntimes}
						calculatedPageSize={calculatedPageSize}
						onLimitChange={setLimit}
						isFetching={isFetching}
						isError={downtimeSchedules.isError}
						refetch={refetchAllSchedules}
						onEdit={handleEdit}
						onDelete={handleDelete}
						onCreate={handleCreate}
						hasSearchTerm={searchValue.length > 0}
						onClearSearch={clearSearch}
					/>
				</AuthZGuardContent>
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
