import './useTableView.styles.scss';

import Convert from 'ansi-to-html';
import { Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import cx from 'classnames';
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
			.filter((e) => e.name !== 'id')
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
				title: 'timestamp',
				dataIndex: 'timestamp',
				key: 'timestamp',
				// https://github.com/ant-design/ant-design/discussions/36886
				render: (field, item): ColumnTypeRender<Record<string, unknown>> => {
					const date =
						typeof field === 'string'
							? formatTimezoneAdjustedTimestamp(field, 'YYYY-MM-DD HH:mm:ss.SSS')
							: formatTimezoneAdjustedTimestamp(
									field / 1e6,
									'YYYY-MM-DD HH:mm:ss.SSS',
							  );
					return {
						children: (
							<div className="table-timestamp">
								<LogStateIndicator
									type={getLogIndicatorTypeForTable(item)}
									fontSize={fontSize}
								/>
								<Typography.Paragraph ellipsis className={cx('text', fontSize)}>
									{date}
								</Typography.Paragraph>
							</div>
						),
					};
				},
			},
			...(appendTo === 'center' ? fieldColumns : []),
			{
				title: 'body',
				dataIndex: 'body',
				key: 'body',
				render: (field): ColumnTypeRender<Record<string, unknown>> => ({
					props: {
						style: defaultTableStyle,
					},
					children: (
						<TableBodyContent
							dangerouslySetInnerHTML={{
								__html: convert.toHtml(
									dompurify.sanitize(unescapeString(field), {
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
