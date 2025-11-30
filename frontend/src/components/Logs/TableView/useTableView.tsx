import './useTableView.styles.scss';

import { Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import cx from 'classnames';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { getSanitizedLogBody } from 'container/LogDetailedView/utils';
import { useIsDarkMode } from 'hooks/useDarkMode';
import {
	FlatLogData,
	LOG_FIELD_BODY_KEY,
	LOG_FIELD_TIMESTAMP_KEY,
} from 'lib/logs/flatLogData';
import { useTimezone } from 'providers/Timezone';
import { useMemo } from 'react';

import LogStateIndicator from '../LogStateIndicator/LogStateIndicator';
import {
	defaultListViewPanelStyle,
	defaultTableStyle,
	getDefaultCellStyle,
} from './config';
import { TableBodyContent } from './styles';
import {
	ColumnTypeRender,
	UseTableViewProps,
	UseTableViewResult,
} from './types';

export const useTableView = (props: UseTableViewProps): UseTableViewResult => {
	const {
		logs,
		fields,
		linesPerRow,
		fontSize,
		appendTo = 'center',
		isListViewPanel,
	} = props;

	const isDarkMode = useIsDarkMode();

	const flattenLogData = useMemo(() => logs.map((log) => FlatLogData(log)), [
		logs,
	]);

	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const bodyColumnStyle = useMemo(
		() => ({
			...defaultTableStyle,
			...(fields.length > 2 ? { width: '50rem' } : {}),
		}),
		[fields.length],
	);

	const columns: ColumnsType<Record<string, unknown>> = useMemo(() => {
		const fieldColumns: ColumnsType<Record<string, unknown>> = fields
			.filter(
				(e) => !['id', LOG_FIELD_BODY_KEY, LOG_FIELD_TIMESTAMP_KEY].includes(e.key),
			)
			.map((field) => ({
				title: field.displayName,
				dataIndex: field.key,
				accessorKey: field.key,
				id: field.key.toLowerCase().replace(/\./g, '_').replace(/:/g, '_'),
				key: field.key,
				render: (fieldValue, record): ColumnTypeRender<Record<string, unknown>> => {
					const value = record[field.key] || fieldValue;
					return {
						props: {
							style: isListViewPanel
								? defaultListViewPanelStyle
								: getDefaultCellStyle(isDarkMode),
						},
						children: (
							<Typography.Paragraph
								ellipsis={{ rows: linesPerRow }}
								className={cx('paragraph', fontSize)}
							>
								{value}
							</Typography.Paragraph>
						),
					};
				},
			}));

		if (isListViewPanel) {
			return [...fieldColumns];
		}

		return [
			{
				// We do not need any title and data index for the log state indicator
				title: '',
				dataIndex: '',
				// eslint-disable-next-line sonarjs/no-duplicate-string
				key: 'state-indicator',
				accessorKey: 'state-indicator',
				id: 'state-indicator',
				render: (_, item): ColumnTypeRender<Record<string, unknown>> => ({
					children: (
						<div className={cx('state-indicator', fontSize)}>
							<LogStateIndicator
								fontSize={fontSize}
								severityText={item.severity_text as string}
								severityNumber={item.severity_number as number}
							/>
						</div>
					),
				}),
			},
			...(fields.some((field) => field.key === LOG_FIELD_TIMESTAMP_KEY)
				? [
						{
							title: 'timestamp',
							dataIndex: LOG_FIELD_TIMESTAMP_KEY,
							key: 'timestamp',
							accessorKey: LOG_FIELD_TIMESTAMP_KEY,
							id: 'timestamp',
							// https://github.com/ant-design/ant-design/discussions/36886
							render: (
								field: string | number,
								record: Record<string, unknown>,
							): ColumnTypeRender<Record<string, unknown>> => {
								const timestampValue =
									(record[LOG_FIELD_TIMESTAMP_KEY] as string | number) || field;
								const date =
									typeof timestampValue === 'string'
										? formatTimezoneAdjustedTimestamp(
												timestampValue,
												DATE_TIME_FORMATS.ISO_DATETIME_MS,
										  )
										: formatTimezoneAdjustedTimestamp(
												timestampValue / 1e6,
												DATE_TIME_FORMATS.ISO_DATETIME_MS,
										  );
								return {
									children: (
										<div className="table-timestamp">
											<Typography.Paragraph ellipsis className={cx('text', fontSize)}>
												{date}
											</Typography.Paragraph>
										</div>
									),
								};
							},
						},
				  ]
				: []),
			...(appendTo === 'center' ? fieldColumns : []),
			...(fields.some((field) => field.key === LOG_FIELD_BODY_KEY)
				? [
						{
							title: 'body',
							dataIndex: LOG_FIELD_BODY_KEY,
							key: 'body',
							accessorKey: LOG_FIELD_BODY_KEY,
							id: 'body',
							render: (
								field: string | number,
								record: Record<string, unknown>,
							): ColumnTypeRender<Record<string, unknown>> => {
								const bodyValue = (record[LOG_FIELD_BODY_KEY] as string) || '';
								return {
									props: {
										style: bodyColumnStyle,
									},
									children: (
										<TableBodyContent
											dangerouslySetInnerHTML={{
												__html: getSanitizedLogBody(bodyValue, {
													shouldEscapeHtml: true,
												}),
											}}
											fontSize={fontSize}
											linesPerRow={linesPerRow}
											isDarkMode={isDarkMode}
										/>
									),
								};
							},
						},
				  ]
				: []),
			...(appendTo === 'end' ? fieldColumns : []),
		];
	}, [
		fields,
		isListViewPanel,
		appendTo,
		isDarkMode,
		linesPerRow,
		fontSize,
		formatTimezoneAdjustedTimestamp,
		bodyColumnStyle,
	]);

	return { columns, dataSource: flattenLogData };
};
