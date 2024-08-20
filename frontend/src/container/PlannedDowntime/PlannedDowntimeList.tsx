/* eslint-disable react/require-default-props */
import './PlannedDowntime.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Collapse, Flex, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import { TableProps } from 'antd/lib';
import {
	DowntimeSchedules,
	PayloadProps,
	Recurrence,
} from 'api/plannedDowntime/getAllDowntimeSchedules';
import { AxiosError, AxiosResponse } from 'axios';
import cx from 'classnames';
import { useNotifications } from 'hooks/useNotifications';
import { defaultTo } from 'lodash-es';
import { CalendarClock, PenLine, Trash2 } from 'lucide-react';
import { ReactNode, useEffect } from 'react';
import { UseQueryResult } from 'react-query';

import {
	formatDateTime,
	getAlertOptionsFromIds,
	getDuration,
	getEndTime,
	recurrenceInfo,
} from './PlannedDowntimeutils';

const { Panel } = Collapse;

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
	handleEdit,
	handleDelete,
}: {
	name: string;
	duration: string;
	handleEdit: () => void;
	handleDelete: () => void;
}): JSX.Element {
	return (
		<Flex className="header-content" justify="space-between">
			<Flex gap={8}>
				<Typography>{name}</Typography>
				<Tag>{duration}</Tag>
			</Flex>

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
		</Flex>
	);
}

export function CollapseListContent({
	created_at,
	created_by_name,
	created_by_email,
	timeframe,
	repeats,
	updated_at,
	updated_by_name,
	alertOptions,
	timezone,
}: {
	created_at?: string;
	created_by_name?: string;
	created_by_email?: string;
	timeframe: [string | undefined | null, string | undefined | null];
	repeats?: Recurrence | null;
	updated_at?: string;
	updated_by_name?: string;
	alertOptions?: DefaultOptionType[];
	timezone?: string;
}): JSX.Element {
	const renderItems = (title: string, value: ReactNode): JSX.Element => (
		<div className="render-item-collapse-list">
			<Typography>{title}</Typography>
			<div className="render-item-value">{value}</div>
		</div>
	);

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
				timeframe[0] || timeframe[1] ? (
					<Typography>{`${formatDateTime(timeframe[0])} ⎯ ${formatDateTime(
						timeframe[1],
					)}`}</Typography>
				) : (
					'-'
				),
			)}
			{renderItems('Timezone', <Typography>{timezone || '-'}</Typography>)}
			{renderItems('Repeats', <Typography>{recurrenceInfo(repeats)}</Typography>)}
			{renderItems(
				'Alerts silenced',
				alertOptions?.length ? (
					<AlertRuleTags
						closable={false}
						classname="alert-rule-collapse-list"
						selectedTags={alertOptions}
					/>
				) : (
					'-'
				),
			)}
		</Flex>
	);
}

export function CustomCollapseList(
	props: DowntimeSchedulesTableData & {
		setInitialValues: React.Dispatch<
			React.SetStateAction<Partial<DowntimeSchedules>>
		>;
		setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
		handleDeleteDowntime: (id: number, name: string) => void;
		setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
	},
): JSX.Element {
	const {
		createdAt,
		createdBy,
		schedule,
		updatedAt,
		updatedBy,
		name,
		id,
		alertOptions,
		setInitialValues,
		setModalOpen,
		handleDeleteDowntime,
		setEditMode,
		kind,
	} = props;

	const scheduleTime = schedule?.startTime ? schedule.startTime : createdAt;
	// Combine time and date
	const formattedDateAndTime = `Start time ⎯ ${formatDateTime(
		defaultTo(scheduleTime, ''),
	)} ${schedule?.timezone}`;
	const endTime = getEndTime({ kind, schedule });

	return (
		<>
			<Collapse accordion className="collapse-list">
				<Panel
					header={
						<HeaderComponent
							duration={
								schedule?.recurrence?.duration
									? (schedule?.recurrence?.duration as string)
									: getDuration(schedule?.startTime, schedule?.endTime)
							}
							name={defaultTo(name, '')}
							handleEdit={(): void => {
								setInitialValues({ ...props });
								setModalOpen(true);
								setEditMode(true);
							}}
							handleDelete={(): void => {
								handleDeleteDowntime(id, name || '');
							}}
						/>
					}
					key={id}
				>
					<CollapseListContent
						created_at={defaultTo(createdAt, '')}
						created_by_name={defaultTo(createdBy, '')}
						timeframe={[
							schedule?.startTime?.toString(),
							typeof endTime === 'string' ? endTime : endTime?.toString(),
						]}
						repeats={schedule?.recurrence}
						updated_at={defaultTo(updatedAt, '')}
						updated_by_name={defaultTo(updatedBy, '')}
						alertOptions={alertOptions}
						timezone={defaultTo(schedule?.timezone, '')}
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

export type DowntimeSchedulesTableData = DowntimeSchedules & {
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
}: {
	downtimeSchedules: UseQueryResult<
		AxiosResponse<PayloadProps, any>,
		AxiosError<unknown, any>
	>;
	alertOptions: DefaultOptionType[];
	setInitialValues: React.Dispatch<
		React.SetStateAction<Partial<DowntimeSchedules>>
	>;
	setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
	handleDeleteDowntime: (id: number, name: string) => void;
	setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
	searchValue: string | number;
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

	const tableData = (downtimeSchedules.data?.data?.data || [])
		.sort((a, b): number => {
			if (a?.updatedAt && b?.updatedAt) {
				return b.updatedAt.localeCompare(a.updatedAt);
			}
			return 0;
		})
		?.filter(
			(data) =>
				data?.name?.includes(searchValue.toLocaleString()) ||
				data?.id.toLocaleString() === searchValue.toLocaleString(),
		)
		.map?.((data) => {
			const specificAlertOptions = getAlertOptionsFromIds(
				data.alertIds || [],
				alertOptions,
			);

			return { ...data, alertOptions: specificAlertOptions };
		});

	useEffect(() => {
		if (downtimeSchedules.isError) {
			notifications.error(downtimeSchedules.error);
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
