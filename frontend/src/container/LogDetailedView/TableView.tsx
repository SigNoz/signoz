import { blue, orange } from '@ant-design/colors';
import { LinkOutlined } from '@ant-design/icons';
import { Input, Space, Tooltip } from 'antd';
import { ColumnsType } from 'antd/es/table';
import Editor from 'components/Editor';
import AddToQueryHOC from 'components/Logs/AddToQueryHOC';
import CopyClipboardHOC from 'components/Logs/CopyClipboardHOC';
import { ResizeTable } from 'components/ResizeTable';
import ROUTES from 'constants/routes';
import flatten from 'flat';
import history from 'lib/history';
import { fieldSearchFilter } from 'lib/logs/fieldSearch';
import { isEmpty } from 'lodash-es';
import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { generatePath } from 'react-router-dom';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { SET_DETAILED_LOG_DATA } from 'types/actions/logs';
import { ILog } from 'types/api/logs/log';

import ActionItem from './ActionItem';
import { recursiveParseJSON } from './utils';

// Fields which should be restricted from adding it to query
const RESTRICTED_FIELDS = ['timestamp'];

interface TableViewProps {
	logData: ILog;
}
function TableView({ logData }: TableViewProps): JSX.Element | null {
	const [fieldSearchInput, setFieldSearchInput] = useState<string>('');

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const flattenLogData: Record<string, never> | null = useMemo(
		() => (logData ? flatten(logData) : null),
		[logData],
	);
	if (logData === null) {
		return null;
	}

	const dataSource =
		flattenLogData !== null &&
		Object.keys(flattenLogData)
			.filter((field) => fieldSearchFilter(field, fieldSearchInput))
			.map((key) => ({
				key,
				field: key,
				value: JSON.stringify(flattenLogData[key]),
			}));

	const onTraceHandler = (record: DataType) => (): void => {
		if (flattenLogData === null) return;

		const traceId = flattenLogData[record.field];

		const spanId = flattenLogData?.span_id;

		if (traceId) {
			dispatch({
				type: SET_DETAILED_LOG_DATA,
				payload: null,
			});

			const basePath = generatePath(ROUTES.TRACE_DETAIL, {
				id: traceId,
			});

			const route = spanId ? `${basePath}?spanId=${spanId}` : basePath;

			history.push(route);
		}
	};

	if (!dataSource) {
		return null;
	}

	const columns: ColumnsType<DataType> = [
		{
			title: 'Action',
			width: 15,
			render: (fieldData: Record<string, string>): JSX.Element | null => {
				const fieldKey = fieldData.field.split('.').slice(-1);
				if (!RESTRICTED_FIELDS.includes(fieldKey[0])) {
					return <ActionItem fieldKey={fieldKey} fieldValue={fieldData.value} />;
				}
				return null;
			},
		},
		{
			title: 'Field',
			dataIndex: 'field',
			key: 'field',
			width: 30,
			align: 'left',
			ellipsis: true,
			render: (field: string, record): JSX.Element => {
				const fieldKey = field.split('.').slice(-1);
				const renderedField = <span style={{ color: blue[4] }}>{field}</span>;

				if (record.field === 'trace_id') {
					const traceId = flattenLogData[record.field];

					return (
						<Space size="middle">
							{renderedField}

							{traceId && (
								<Tooltip title="Inspect in Trace">
									<div
										style={{ cursor: 'pointer' }}
										role="presentation"
										onClick={onTraceHandler(record)}
									>
										<LinkOutlined
											style={{
												width: '15px',
											}}
										/>
									</div>
								</Tooltip>
							)}
						</Space>
					);
				}

				if (!RESTRICTED_FIELDS.includes(fieldKey[0])) {
					return (
						<AddToQueryHOC fieldKey={fieldKey[0]} fieldValue={flattenLogData[field]}>
							{renderedField}
						</AddToQueryHOC>
					);
				}
				return renderedField;
			},
		},
		{
			title: 'Value',
			dataIndex: 'value',
			key: 'value',
			width: 80,
			ellipsis: false,
			render: (field, record): JSX.Element => {
				if (record.field === 'body') {
					const parsedBody = recursiveParseJSON(field);
					if (!isEmpty(parsedBody)) {
						return (
							<Editor
								value={JSON.stringify(parsedBody, null, 2).replace(/\\n/g, '\n')}
								readOnly
								height="70vh"
								options={{
									minimap: {
										enabled: false,
									},
								}}
							/>
						);
					}
				}

				return (
					<CopyClipboardHOC textToCopy={field}>
						<span style={{ color: orange[6] }}>{field}</span>
					</CopyClipboardHOC>
				);
			},
		},
	];

	return (
		<>
			<Input
				placeholder="Search field names"
				size="large"
				value={fieldSearchInput}
				onChange={(e): void => setFieldSearchInput(e.target.value)}
			/>
			<ResizeTable
				columns={columns}
				tableLayout="fixed"
				dataSource={dataSource}
				pagination={false}
			/>
		</>
	);
}

interface DataType {
	key: string;
	field: string;
	value: string;
}

export default TableView;
