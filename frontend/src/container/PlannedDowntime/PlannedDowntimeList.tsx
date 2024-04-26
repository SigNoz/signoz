/* eslint-disable react/require-default-props */
import './PlannedDowntime.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Collapse, Flex, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import { TableProps } from 'antd/lib';
import cx from 'classnames';
import { CalendarClock, PenLine, Trash2 } from 'lucide-react';
import { Key, ReactNode } from 'react';

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
				console.log(isLongTag, tag, tag.label);
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

function HeaderComponent(): JSX.Element {
	return (
		<Flex className="header-content" justify="space-between">
			<Flex gap={8}>
				<Typography>test-downtime</Typography>
				<Tag>40 min</Tag>
			</Flex>

			<div className="action-btn">
				<PenLine
					size={14}
					// className={isEditDeleteSupported ? '' : 'hidden'}
					// onClick={(): void => handleEditModelOpen(view, bgColor)}
				/>
				<Trash2
					size={14}
					// className={isEditDeleteSupported ? '' : 'hidden'}
					color={Color.BG_CHERRY_500}
					// onClick={(): void => handleDeleteModelOpen(view.uuid, view.name)}
				/>
			</div>
		</Flex>
	);
}
const formatDateTime = (dateTimeString: string): string => {
	const options: Intl.DateTimeFormatOptions = {
		month: 'short',
		day: '2-digit',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	};
	return new Date(dateTimeString).toLocaleString('en-US', options);
};

export function CollapseListContent({
	created_at,
	created_by_name,
	created_by_email,
	timeframe,
	repeats,
}: {
	created_at: string;
	created_by_name: string;
	created_by_email: string;
	timeframe: [string, string];
	repeats: string;
}): JSX.Element {
	const renderItems = (title: string, value: ReactNode): JSX.Element => (
		<Flex style={{ marginBottom: 13 }}>
			<Typography style={{ width: 128 }}>{title}</Typography>
			{value}
		</Flex>
	);
	return (
		<Flex vertical>
			{renderItems(
				'Created by',
				<Flex gap={8}>
					<Typography>{created_by_name}</Typography>
					<Tag style={{ borderRadius: 20 }}>{created_by_email}</Tag>
				</Flex>,
			)}
			{renderItems(
				'Created on',
				<Typography>{`${formatDateTime(created_at)}`}</Typography>,
			)}
			{renderItems(
				'Timeframe',
				<Typography>{`${formatDateTime(timeframe[0])} ⎯ ${formatDateTime(
					timeframe[1],
				)}`}</Typography>,
			)}
			{renderItems('Repeats', <Typography>{repeats}</Typography>)}
			{renderItems(
				'Alerts silenced',
				<AlertRuleTags
					closable={false}
					classname="alert-rule-collapse-list"
					selectedTags={[
						{ label: 'test-alert', value: '1' },
						{ label: 'test-copy', value: '2' },
						{ label: 'test-alert', value: '1' },
						{ label: 'test-copy', value: '21' },
						{ label: 'test-alert', value: '11' },
						{ label: 'test-copy', value: '22' },
						{ label: 'test-alert', value: '12' },
						{ label: 'test-copy', value: '23' },
						{ label: 'test-alert', value: '13' },
						{ label: 'test-copy', value: '24' },
						{ label: 'test-alert', value: '15' },
						{ label: 'test-copy', value: '25' },
						{ label: 'test-alert', value: '16' },
						{ label: 'test-copy', value: '261' },
						{ label: 'test-copy', value: '221' },
						{ label: 'test-alert', value: '121' },
						{ label: 'test-copy', value: '213' },
						{ label: 'test-alert', value: '113' },
						{ label: 'test-copy', value: '241' },
						{ label: 'test-alert', value: '115' },
						{ label: 'test-copy', value: '215' },
						{ label: 'test-alert', value: '116' },
						{ label: 'test-copy', value: '216' },
					]}
				/>,
			)}
		</Flex>
	);
}

export function CustomCollapseList(): JSX.Element {
	const createdAt = '2024-01-18T10:39:33.43776243Z';

	// Combine time and date
	const formattedDateAndTime = `Coming up on ⎯ ${formatDateTime(createdAt)}`;

	return (
		<>
			<Collapse accordion className="collapse-list">
				<Panel header={<HeaderComponent />} key="1">
					{/* <List size="small">
						{renderListItems(0, Math.ceil(dataSource.length / 2))}
					</List> */}
					<CollapseListContent
						created_at={createdAt}
						created_by_email="valdez@signoz.com"
						created_by_name="Leo Valdez"
						timeframe={[createdAt, createdAt]}
						repeats="No"
					/>
				</Panel>
			</Collapse>
			<div className="view-created-at">
				<CalendarClock size={14} />
				<Typography.Text>{formattedDateAndTime}</Typography.Text>
			</div>
		</>
	);
}

export function PlannedDowntimeList(): JSX.Element {
	const columns: TableProps<Data>['columns'] = [
		{
			title: 'Downtime',
			key: 'downtime',
			render: (downtime: Data): JSX.Element => <CustomCollapseList />,
		},
	];
	return (
		<Table
			columns={columns}
			className="planned-downtime-table"
			bordered={false}
			dataSource={[
				{ key: 'id', createdAt: '2024-01-18T10:39:33.43776243Z' },
				{ key: 'id', createdAt: '2024-01-18T10:39:33.43776243Z' },
				{ key: 'id', createdAt: '2024-01-18T10:39:33.43776243Z' },
				{ key: 'id', createdAt: '2024-01-18T10:39:33.43776243Z' },
				{ key: 'id', createdAt: '2024-01-18T10:39:33.43776243Z' },
				{ key: 'id', createdAt: '2024-01-18T10:39:33.43776243Z' },
			]}
			// loading={isDashboardListLoading || isFilteringDashboards}
			showHeader={false}
			pagination={{ pageSize: 5, showSizeChanger: false }}
		/>
	);
}

export interface Data {
	key: Key;
	name: string;
	repeat: string;
	tags: string[];
	createdBy: string;
	createdAt: string;
	lastUpdatedTime: string;
	lastUpdatedBy: string;
	timeFrame: [string, string];
	id: string;
}
