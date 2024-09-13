/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './TableView.styles.scss';

import { LinkOutlined } from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import { Button, Space, Tooltip, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import cx from 'classnames';
import AddToQueryHOC, {
	AddToQueryHOCProps,
} from 'components/Logs/AddToQueryHOC';
import { ResizeTable } from 'components/ResizeTable';
import { OPERATORS } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { FontSize, OptionsQuery } from 'container/OptionsMenu/types';
import { useIsDarkMode } from 'hooks/useDarkMode';
import history from 'lib/history';
import { fieldSearchFilter } from 'lib/logs/fieldSearch';
import { removeJSONStringifyQuotes } from 'lib/removeJSONStringifyQuotes';
import { Pin } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { generatePath } from 'react-router-dom';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { SET_DETAILED_LOG_DATA } from 'types/actions/logs';
import { IField } from 'types/api/logs/fields';
import { ILog } from 'types/api/logs/log';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { ActionItemProps } from './ActionItem';
import FieldRenderer from './FieldRenderer';
import { TableViewActions } from './TableView/TableViewActions';
import { filterKeyForField, findKeyPath, flattenObject } from './utils';

// Fields which should be restricted from adding it to query
const RESTRICTED_FIELDS = ['timestamp'];

interface TableViewProps {
	logData: ILog;
	fieldSearchInput: string;
	selectedOptions: OptionsQuery;
	isListViewPanel?: boolean;
	listViewPanelSelectedFields?: IField[] | null;
	onGroupByAttribute?: (
		fieldKey: string,
		isJSON?: boolean,
		dataType?: DataTypes,
	) => Promise<void>;
}

type Props = TableViewProps &
	Partial<Pick<ActionItemProps, 'onClickActionItem'>> &
	Pick<AddToQueryHOCProps, 'onAddToQuery'>;

function TableView({
	logData,
	fieldSearchInput,
	onAddToQuery,
	onClickActionItem,
	isListViewPanel = false,
	selectedOptions,
	onGroupByAttribute,
	listViewPanelSelectedFields,
}: Props): JSX.Element | null {
	const dispatch = useDispatch<Dispatch<AppActions>>();
	const [isfilterInLoading, setIsFilterInLoading] = useState<boolean>(false);
	const [isfilterOutLoading, setIsFilterOutLoading] = useState<boolean>(false);
	const isDarkMode = useIsDarkMode();

	const [pinnedAttributes, setPinnedAttributes] = useState<
		Record<string, boolean>
	>({});

	useEffect(() => {
		const pinnedAttributes: Record<string, boolean> = {};

		if (isListViewPanel) {
			listViewPanelSelectedFields?.forEach((val) => {
				const path = findKeyPath(logData, val.name, '');
				if (path) {
					pinnedAttributes[path] = true;
				}
			});
		} else {
			selectedOptions.selectColumns.forEach((val) => {
				const path = findKeyPath(logData, val.key, '');
				if (path) {
					pinnedAttributes[path] = true;
				}
			});
		}

		setPinnedAttributes(pinnedAttributes);
	}, [
		logData,
		selectedOptions.selectColumns,
		listViewPanelSelectedFields,
		isListViewPanel,
	]);

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
		if (operator === OPERATORS['=']) {
			setIsFilterInLoading(true);
		}
		if (operator === OPERATORS['!=']) {
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

	const onTraceHandler = (
		record: DataType,
		event: React.MouseEvent<HTMLDivElement, MouseEvent>,
	): void => {
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

			if (event.ctrlKey || event.metaKey) {
				// open the trace in new tab
				window.open(route, '_blank');
			} else {
				history.push(route);
			}
		}
	};

	if (!dataSource) {
		return null;
	}

	const columns: ColumnsType<DataType> = [
		{
			title: '',
			dataIndex: 'pin',
			key: 'pin',
			width: 5,
			align: 'left',
			className: 'attribute-pin value-field-container',
			render: (fieldData: Record<string, string>, record): JSX.Element => {
				let pinColor = isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_500;

				if (pinnedAttributes[record?.key]) {
					pinColor = Color.BG_ROBIN_500;
				}

				return (
					<div className="log-attribute-pin value-field">
						<div
							className={cx(
								'pin-attribute-icon',
								pinnedAttributes[record?.key] ? 'pinned' : '',
							)}
						>
							{pinnedAttributes[record?.key] && <Pin size={14} color={pinColor} />}
						</div>
					</div>
				);
			},
		},
		{
			title: 'Field',
			dataIndex: 'field',
			key: 'field',
			width: 50,
			align: 'left',
			ellipsis: true,
			className: 'attribute-name',
			render: (field: string, record): JSX.Element => {
				const renderedField = <FieldRenderer field={field} />;

				if (record.field === 'trace_id') {
					const traceId = flattenLogData[record.field];

					return (
						<Space size="middle" className="log-attribute">
							<Typography.Text>{renderedField}</Typography.Text>

							{traceId && (
								<Tooltip title="Inspect in Trace">
									<Button
										className="periscope-btn"
										onClick={(
											event: React.MouseEvent<HTMLDivElement, MouseEvent>,
										): void => {
											onTraceHandler(record, event);
										}}
									>
										<LinkOutlined
											style={{
												width: '15px',
											}}
										/>
									</Button>
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
							fontSize={FontSize.SMALL}
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
			className: 'value-field-container attribute-value',
			render: (fieldData: Record<string, string>, record): JSX.Element => (
				<TableViewActions
					fieldData={fieldData}
					record={record}
					isListViewPanel={isListViewPanel}
					isfilterInLoading={isfilterInLoading}
					isfilterOutLoading={isfilterOutLoading}
					onClickHandler={onClickHandler}
					onGroupByAttribute={onGroupByAttribute}
				/>
			),
		},
	];
	function sortPinnedAttributes(
		data: Record<string, string>[],
		sortingObj: Record<string, boolean>,
	): Record<string, string>[] {
		const sortingKeys = Object.keys(sortingObj);
		return data.sort((a, b) => {
			const aKey = a.key;
			const bKey = b.key;
			const aSortIndex = sortingKeys.indexOf(aKey);
			const bSortIndex = sortingKeys.indexOf(bKey);

			if (sortingObj[aKey] && !sortingObj[bKey]) {
				return -1;
			}
			if (!sortingObj[aKey] && sortingObj[bKey]) {
				return 1;
			}
			return aSortIndex - bSortIndex;
		});
	}

	const sortedAttributes = sortPinnedAttributes(dataSource, pinnedAttributes);

	return (
		<ResizeTable
			columns={columns}
			tableLayout="fixed"
			dataSource={sortedAttributes}
			pagination={false}
			showHeader={false}
			className="attribute-table-container"
		/>
	);
}

TableView.defaultProps = {
	isListViewPanel: false,
	listViewPanelSelectedFields: null,
	onGroupByAttribute: undefined,
};

export interface DataType {
	key: string;
	field: string;
	value: string;
}

export default TableView;
