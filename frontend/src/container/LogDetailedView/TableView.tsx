import './TableView.styles.scss';

import { LinkOutlined } from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import { Button, Space, Spin, Tooltip, Tree } from 'antd';
import { ColumnsType } from 'antd/es/table';
import AddToQueryHOC, {
	AddToQueryHOCProps,
} from 'components/Logs/AddToQueryHOC';
import CopyClipboardHOC from 'components/Logs/CopyClipboardHOC';
import { ResizeTable } from 'components/ResizeTable';
import { OPERATORS } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { fieldSearchFilter } from 'lib/logs/fieldSearch';
import { removeJSONStringifyQuotes } from 'lib/removeJSONStringifyQuotes';
import { isEmpty } from 'lodash-es';
import { ArrowDownToDot, ArrowUpFromDot } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { generatePath } from 'react-router-dom';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { SET_DETAILED_LOG_DATA } from 'types/actions/logs';
import { ILog } from 'types/api/logs/log';

import { ActionItemProps } from './ActionItem';
import FieldRenderer from './FieldRenderer';
import {
	filterKeyForField,
	flattenObject,
	jsonToDataNodes,
	recursiveParseJSON,
	removeEscapeCharacters,
} from './utils';

// Fields which should be restricted from adding it to query
const RESTRICTED_FIELDS = ['timestamp'];

interface TableViewProps {
	logData: ILog;
	fieldSearchInput: string;
}

type Props = TableViewProps &
	Partial<Pick<ActionItemProps, 'onClickActionItem'>> &
	Pick<AddToQueryHOCProps, 'onAddToQuery'>;

function TableView({
	logData,
	fieldSearchInput,
	onAddToQuery,
	onClickActionItem,
}: Props): JSX.Element | null {
	const dispatch = useDispatch<Dispatch<AppActions>>();
	const [isfilterInLoading, setIsFilterInLoading] = useState<boolean>(false);
	const [isfilterOutLoading, setIsFilterOutLoading] = useState<boolean>(false);

	const flattenLogData: Record<string, string> | null = useMemo(
		() => (logData ? flattenObject(logData) : null),
		[logData],
	);

	const handleClick = (
		operator: string,
		fieldKey: string,
		fieldValue: string,
	): void => {
		const validatedFieldValue = removeJSONStringifyQuotes(fieldValue);
		if (onClickActionItem) {
			onClickActionItem(fieldKey, validatedFieldValue, operator);
		}
	};

	const onClickHandler = (
		operator: string,
		fieldKey: string,
		fieldValue: string,
	) => (): void => {
		handleClick(operator, fieldKey, fieldValue);
		if (operator === OPERATORS.IN) {
			setIsFilterInLoading(true);
		}
		if (operator === OPERATORS.NIN) {
			setIsFilterOutLoading(true);
		}
	};

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
			title: 'Field',
			dataIndex: 'field',
			key: 'field',
			width: 50,
			align: 'left',
			ellipsis: true,
			render: (field: string, record): JSX.Element => {
				const renderedField = <FieldRenderer field={field} />;

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

				const fieldFilterKey = filterKeyForField(field);
				if (!RESTRICTED_FIELDS.includes(fieldFilterKey)) {
					return (
						<AddToQueryHOC
							fieldKey={fieldFilterKey}
							fieldValue={flattenLogData[field]}
							onAddToQuery={onAddToQuery}
						>
							{renderedField}
						</AddToQueryHOC>
					);
				}
				return renderedField;
			},
		},
		{
			title: 'Value',
			key: 'value',
			width: 70,
			ellipsis: false,
			className: 'value-field-container',
			render: (fieldData: Record<string, string>, record): JSX.Element => {
				const textToCopy = fieldData.value.slice(1, -1);

				if (record.field === 'body') {
					const parsedBody = recursiveParseJSON(fieldData.value);
					if (!isEmpty(parsedBody)) {
						return (
							<Tree defaultExpandAll showLine treeData={jsonToDataNodes(parsedBody)} />
						);
					}
				}

				const fieldFilterKey = filterKeyForField(fieldData.field);

				return (
					<div className="value-field">
						<CopyClipboardHOC textToCopy={textToCopy}>
							<span style={{ color: Color.BG_SIENNA_400 }}>
								{removeEscapeCharacters(fieldData.value)}
							</span>
						</CopyClipboardHOC>
						<span className="action-btn">
							<Button
								className="filter-btn"
								icon={
									isfilterInLoading ? (
										<Spin size="small" />
									) : (
										<ArrowDownToDot size={14} style={{ transform: 'rotate(90deg)' }} />
									)
								}
								onClick={onClickHandler(OPERATORS.IN, fieldFilterKey, fieldData.value)}
							>
								Filter for value
							</Button>
							<Button
								className="filter-btn"
								icon={
									isfilterOutLoading ? (
										<Spin size="small" />
									) : (
										<ArrowUpFromDot size={14} style={{ transform: 'rotate(90deg)' }} />
									)
								}
								onClick={onClickHandler(OPERATORS.NIN, fieldFilterKey, fieldData.value)}
							>
								Filter out value
							</Button>
						</span>
					</div>
				);
			},
		},
	];

	return (
		<ResizeTable
			columns={columns}
			tableLayout="fixed"
			dataSource={dataSource}
			pagination={false}
			showHeader={false}
			className="attribute-table-container"
		/>
	);
}

interface DataType {
	key: string;
	field: string;
	value: string;
}

export default TableView;
