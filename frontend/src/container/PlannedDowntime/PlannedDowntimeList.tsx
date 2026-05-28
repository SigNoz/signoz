import React, { ReactNode, useEffect } from 'react';
import { UseQueryResult } from 'react-query';
import { Color } from '@signozhq/design-tokens';
import { Badge } from '@signozhq/ui/badge';
import { Typography } from '@signozhq/ui/typography';
import { Collapse, Flex, Space, Table, TableProps, Tag, Tooltip } from 'antd';
import type { DefaultOptionType } from 'antd/es/select';
import {
	AlertmanagertypesMaintenanceStatusDTO,
	type ListDowntimeSchedules200,
	type RenderErrorResponseDTO,
	type AlertmanagertypesPlannedMaintenanceDTO,
	type AlertmanagertypesScheduleDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { ErrorType } from 'api/generatedAPIInstance';
import cx from 'classnames';
import dayjs from 'dayjs';
import { useNotifications } from 'hooks/useNotifications';
import { defaultTo } from 'lodash-es';
import { CalendarClock, PenLine, Trash2 } from '@signozhq/icons';
import { useAppContext } from 'providers/App/App';
import { USER_ROLES } from 'types/roles';

import { showErrorNotification } from 'utils/error';
import {
	formatDateTime,
	getAlertOptionsFromIds,
	getDuration,
	recurrenceInfo,
} from './PlannedDowntimeutils';

import './PlannedDowntime.styles.scss';

const { Panel } = Collapse;

export type StatusFilter =
	| 'all'
	| 'activeAndUpcoming'
	| AlertmanagertypesMaintenanceStatusDTO.expired;

const STATUS_BADGE_PROPS: Record<
	AlertmanagertypesMaintenanceStatusDTO,
	{ color: 'forest' | 'robin' | 'vanilla'; label: string }
> = {
	[AlertmanagertypesMaintenanceStatusDTO.active]: {
		color: 'forest',
		label: 'Active',
	},
	[AlertmanagertypesMaintenanceStatusDTO.upcoming]: {
		color: 'robin',
		label: 'Upcoming',
	},
	[AlertmanagertypesMaintenanceStatusDTO.expired]: {
		color: 'vanilla',
		label: 'Expired',
	},
};

const matchesStatusFilter = (
	status: AlertmanagertypesMaintenanceStatusDTO | undefined,
	filter: StatusFilter,
): boolean => {
	if (filter === 'all') {
		return true;
	}
	if (filter === 'activeAndUpcoming') {
		return (
			status === AlertmanagertypesMaintenanceStatusDTO.active ||
			status === AlertmanagertypesMaintenanceStatusDTO.upcoming
		);
	}
	return status === filter;
};

function StatusBadge({
	status,
}: {
	status?: AlertmanagertypesMaintenanceStatusDTO;
}): JSX.Element | null {
	if (!status) {
		return null;
	}
	const props = STATUS_BADGE_PROPS[status];
	if (!props) {
		return null;
	}
	return (
		<Badge color={props.color} variant="outline">
			{props.label}
		</Badge>
	);
}

interface AlertRuleTagsProps {
	selectedTags: DefaultOptionType | DefaultOptionType[];
	closable: boolean;
	handleClose?: (removedTag: DefaultOptionType['value']) => void;
	classname?: string;
}
export function AlertRuleTags(props: AlertRuleTagsProps): JSX.Element {
	const { closable, selectedTags, handleClose, classname } = props;
	return (
		<Space
			wrap
			style={{ marginBottom: 8 }}
			className={cx('alert-rule-tags', classname)}
		>
			{selectedTags?.map((tag: DefaultOptionType, index: number) => {
				const isLongTag = (tag?.label as string)?.length > 20;
				const tagElem = (
					<Tag
						key={tag.value}
						onClose={(): void => handleClose?.(tag?.value)}
						closable={closable}
						className={cx(
							{ 'red-tag': index % 2 },
							{ 'non-closable-tag': !closable },
						)}
					>
						<span>
							{isLongTag
								? `${(tag?.label as string | null)?.slice(0, 20)}...`
								: tag?.label}
						</span>
					</Tag>
				);
				return isLongTag ? (
					<Tooltip title={tag?.label} key={tag?.value}>
						{tagElem}
					</Tooltip>
				) : (
					tagElem
				);
			})}
		</Space>
	);
}

function HeaderComponent({
	name,
	duration,
	status,
	handleEdit,
	handleDelete,
}: {
	name: string;
	duration: string;
	status?: AlertmanagertypesMaintenanceStatusDTO;
	handleEdit: () => void;
	handleDelete: () => void;
}): JSX.Element {
	const { user } = useAppContext();
	const isCrudEnabled = user?.role !== USER_ROLES.VIEWER;
	return (
		<Flex className="header-content" justify="space-between">
			<Flex gap={8} align="center">
				<Typography>{name}</Typography>
				<Tag>{duration}</Tag>
				<StatusBadge status={status} />
			</Flex>

			{isCrudEnabled && (
				<div className="action-btn">
					<PenLine
						size={14}
						onClick={(e): void => {
							e.preventDefault();
							e.stopPropagation();
							handleEdit();
						}}
					/>
					<Trash2
						size={14}
						color={Color.BG_CHERRY_500}
						onClick={(e): void => {
							e.preventDefault();
							e.stopPropagation();
							handleDelete();
						}}
					/>
				</div>
			)}
		</Flex>
	);
}

export function CollapseListContent({
	created_at,
	created_by_name,
	created_by_email,
	schedule,
	updated_at,
	updated_by_name,
	alertOptions,
}: {
	created_at?: string;
	created_by_name?: string;
	created_by_email?: string;
	schedule?: AlertmanagertypesScheduleDTO;
	updated_at?: string;
	updated_by_name?: string;
	alertOptions?: DefaultOptionType[];
}): JSX.Element {
	const repeats = schedule?.recurrence;
	const renderItems = (title: string, value: ReactNode): JSX.Element => (
		<div className="render-item-collapse-list">
			<Typography>{title}</Typography>
			<div className="render-item-value">{value}</div>
		</div>
	);
	const startTime = formatDateTime(schedule?.startTime, schedule?.timezone);
	const endTime = formatDateTime(schedule?.endTime, schedule?.timezone);

	return (
		<Flex vertical>
			{renderItems(
				'Created by',
				created_by_name ? (
					<Flex gap={8}>
						<Typography>{created_by_name}</Typography>
						{created_by_email && (
							<Tag style={{ borderRadius: 20 }}>{created_by_email}</Tag>
						)}
					</Flex>
				) : (
					'-'
				),
			)}
			{renderItems(
				'Created on',
				created_at ? (
					<Typography>{`${formatDateTime(created_at)}`}</Typography>
				) : (
					'-'
				),
			)}
			{updated_at &&
				renderItems(
					'Updated on',
					<Typography>{`${formatDateTime(updated_at)}`}</Typography>,
				)}
			{updated_by_name &&
				renderItems('Updated by', <Typography>{updated_by_name}</Typography>)}

			{renderItems(
				'Timeframe',
				schedule?.startTime ? (
					<Typography>
						{schedule?.endTime ? `${startTime} ⎯ ${endTime}` : `${startTime} onwards`}
					</Typography>
				) : (
					'-'
				),
			)}
			{renderItems(
				'Timezone',
				<Typography>{schedule?.timezone || '-'}</Typography>,
			)}
			{renderItems(
				'Repeats',
				<Typography>{recurrenceInfo(repeats, schedule?.timezone)}</Typography>,
			)}
			{renderItems(
				'Alerts silenced',
				alertOptions?.length ? (
					<AlertRuleTags
						closable={false}
						classname="alert-rule-collapse-list"
						selectedTags={alertOptions}
					/>
				) : (
					<Tag className="all-alerts-tag">All alert rules</Tag>
				),
			)}
		</Flex>
	);
}

export function CustomCollapseList(
	props: DowntimeSchedulesTableData & {
		setInitialValues: React.Dispatch<
			React.SetStateAction<Partial<AlertmanagertypesPlannedMaintenanceDTO>>
		>;
		setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
		handleDeleteDowntime: (id: string, name: string) => void;
		setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
	},
): JSX.Element {
	const {
		createdAt,
		createdBy,
		schedule,
		status,
		updatedAt,
		updatedBy,
		name,
		id,
		alertOptions,
		setInitialValues,
		setModalOpen,
		handleDeleteDowntime,
		setEditMode,
	} = props;

	const scheduleTime = schedule?.startTime
		? dayjs(schedule.startTime).tz(schedule.timezone)
		: createdAt || '';
	const formattedDateAndTime = `Start time ⎯ ${formatDateTime(scheduleTime)} ${schedule?.timezone}`;

	return (
		<>
			<Collapse accordion className="collapse-list">
				<Panel
					header={
						<HeaderComponent
							duration={
								schedule?.recurrence?.duration
									? schedule.recurrence.duration
									: getDuration(schedule?.startTime || '', schedule?.endTime || '')
							}
							name={defaultTo(name, '')}
							status={status}
							handleEdit={() => {
								setInitialValues({ ...props });
								setModalOpen(true);
								setEditMode(true);
							}}
							handleDelete={() => handleDeleteDowntime(id ?? '', name || '')}
						/>
					}
					key={id ?? ''}
				>
					<CollapseListContent
						created_at={createdAt ? dayjs(createdAt).toISOString() : ''}
						created_by_name={defaultTo(createdBy, '')}
						schedule={schedule}
						updated_at={updatedAt ? dayjs(updatedAt).toISOString() : ''}
						updated_by_name={defaultTo(updatedBy, '')}
						alertOptions={alertOptions}
					/>
				</Panel>
			</Collapse>
			<div className="schedule-created-at">
				<CalendarClock size={14} />
				<Typography.Text>{formattedDateAndTime}</Typography.Text>
			</div>
		</>
	);
}

export type DowntimeSchedulesTableData =
	AlertmanagertypesPlannedMaintenanceDTO & {
		alertOptions: DefaultOptionType[];
	};

export function PlannedDowntimeList({
	downtimeSchedules,
	alertOptions,
	setInitialValues,
	setModalOpen,
	handleDeleteDowntime,
	setEditMode,
	searchValue,
	statusFilter,
}: {
	downtimeSchedules: UseQueryResult<
		ListDowntimeSchedules200,
		ErrorType<RenderErrorResponseDTO>
	>;
	alertOptions: DefaultOptionType[];
	setInitialValues: React.Dispatch<
		React.SetStateAction<Partial<AlertmanagertypesPlannedMaintenanceDTO>>
	>;
	setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
	handleDeleteDowntime: (id: string, name: string) => void;
	setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
	searchValue: string | number;
	statusFilter: StatusFilter;
}): JSX.Element {
	const columns: TableProps<DowntimeSchedulesTableData>['columns'] = [
		{
			title: 'Downtime',
			key: 'downtime',
			render: (data: DowntimeSchedulesTableData): JSX.Element =>
				CustomCollapseList({
					...data,
					setInitialValues,
					setModalOpen,
					handleDeleteDowntime,
					setEditMode,
				}),
		},
	];
	const { notifications } = useNotifications();

	const statusOrder: Record<AlertmanagertypesMaintenanceStatusDTO, number> = {
		[AlertmanagertypesMaintenanceStatusDTO.active]: 0,
		[AlertmanagertypesMaintenanceStatusDTO.upcoming]: 1,
		[AlertmanagertypesMaintenanceStatusDTO.expired]: 2,
	};

	const tableData = [...(downtimeSchedules.data?.data || [])]
		.filter((data) => matchesStatusFilter(data.status, statusFilter))
		.filter(
			(data) =>
				data.name.includes(searchValue.toLocaleString()) ||
				data.id === searchValue.toLocaleString(),
		)
		.sort((a, b): number => {
			const statusDiff =
				(statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
			if (statusDiff !== 0) {
				return statusDiff;
			}
			if (a?.updatedAt && b?.updatedAt) {
				return dayjs(b.updatedAt).diff(dayjs(a.updatedAt));
			}
			return 0;
		})
		.map((data) => {
			const specificAlertOptions = getAlertOptionsFromIds(
				data.alertIds || [],
				alertOptions,
			);

			return { ...data, alertOptions: specificAlertOptions };
		});

	useEffect(() => {
		if (downtimeSchedules.isError) {
			showErrorNotification(notifications, downtimeSchedules.error);
		}
	}, [downtimeSchedules.error, downtimeSchedules.isError, notifications]);

	const paginationConfig = {
		pageSize: 5,
		showSizeChanger: false,
		hideOnSinglePage: true,
	};
	return (
		<Table<DowntimeSchedulesTableData>
			columns={columns}
			className="planned-downtime-table"
			bordered={false}
			dataSource={tableData || []}
			loading={downtimeSchedules.isLoading || downtimeSchedules.isFetching}
			showHeader={false}
			pagination={paginationConfig}
		/>
	);
}
