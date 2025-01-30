import './useTableView.styles.scss';

import Convert from 'ansi-to-html';
import { Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import cx from 'classnames';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { unescapeString } from 'container/LogDetailedView/utils';
import dompurify from 'dompurify';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { FlatLogData } from 'lib/logs/flatLogData';
import { useTimezone } from 'providers/Timezone';
import { useMemo } from 'react';
import { FORBID_DOM_PURIFY_TAGS } from 'utils/app';

import LogStateIndicator from '../LogStateIndicator/LogStateIndicator';
import { getLogIndicatorTypeForTable } from '../LogStateIndicator/utils';
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

const convert = new Convert();

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

	const columns: ColumnsType<Record<string, unknown>> = useMemo(() => {
		const fieldColumns: ColumnsType<Record<string, unknown>> = fields
			.filter((e) => !['id', 'body', 'timestamp'].includes(e.name))
			.map(({ name }) => ({
				title: name,
				dataIndex: name,
				key: name,
				render: (field): ColumnTypeRender<Record<string, unknown>> => ({
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
							{field}
						</Typography.Paragraph>
					),
				}),
			}));

		if (isListViewPanel) {
			return [...fieldColumns];
		}

		return [
			{
				// We do not need any title and data index for the log state indicator
				title: '',
				dataIndex: '',
				key: 'state-indicator',
				render: (_, item): ColumnTypeRender<Record<string, unknown>> => ({
					children: (
						<div className={cx('state-indicator', fontSize)}>
							<LogStateIndicator
								type={getLogIndicatorTypeForTable(item)}
								fontSize={fontSize}
							/>
						</div>
					),
				}),
			},
			...(fields.some((field) => field.name === 'timestamp')
				? [
						{
							title: 'timestamp',
							dataIndex: 'timestamp',
							key: 'timestamp',
							// https://github.com/ant-design/ant-design/discussions/36886
							render: (
								field: string | number,
							): ColumnTypeRender<Record<string, unknown>> => {
								const date =
									typeof field === 'string'
										? formatTimezoneAdjustedTimestamp(
												field,
												DATE_TIME_FORMATS.ISO_DATETIME_MS,
										  )
										: formatTimezoneAdjustedTimestamp(
												field / 1e6,
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
			...(fields.some((field) => field.name === 'body')
				? [
						{
							title: 'body',
							dataIndex: 'body',
							key: 'body',
							render: (
								field: string | number,
							): ColumnTypeRender<Record<string, unknown>> => ({
								props: {
									style: defaultTableStyle,
								},
								children: (
									<TableBodyContent
										dangerouslySetInnerHTML={{
											__html: convert.toHtml(
												dompurify.sanitize(unescapeString(field as string), {
													FORBID_TAGS: [...FORBID_DOM_PURIFY_TAGS],
												}),
											),
										}}
										fontSize={fontSize}
										linesPerRow={linesPerRow}
										isDarkMode={isDarkMode}
									/>
								),
							}),
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
	]);

	return { columns, dataSource: flattenLogData };
};
