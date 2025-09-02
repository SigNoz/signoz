/* eslint-disable sonarjs/no-duplicate-string */
import './TableViewActions.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Popover, Spin, Tooltip, Tree } from 'antd';
import GroupByIcon from 'assets/CustomIcons/GroupByIcon';
import cx from 'classnames';
import CopyClipboardHOC from 'components/Logs/CopyClipboardHOC';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { OPERATORS } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { RESTRICTED_SELECTED_FIELDS } from 'container/LogsFilters/config';
import { MetricsType } from 'container/MetricsApplication/constant';
import { ArrowDownToDot, ArrowUpFromDot, Ellipsis } from 'lucide-react';
import { useTimezone } from 'providers/Timezone';
import React, { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { DataType } from '../TableView';
import {
	filterKeyForField,
	getFieldAttributes,
	getSanitizedLogBody,
	parseFieldValue,
	removeEscapeCharacters,
} from '../utils';
import useAsyncJSONProcessing from './useAsyncJSONProcessing';

interface ITableViewActionsProps {
	fieldData: Record<string, string>;
	record: DataType;
	isListViewPanel: boolean;
	isfilterInLoading: boolean;
	isfilterOutLoading: boolean;
	onGroupByAttribute?: (fieldKey: string, dataType?: DataTypes) => Promise<void>;
	onClickHandler: (
		operator: string,
		fieldKey: string,
		fieldValue: string,
		dataType: string | undefined,
		logType: MetricsType | undefined,
	) => () => void;
}

// Memoized Tree Component
const MemoizedTree = React.memo<{ treeData: any[] }>(({ treeData }) => (
	<Tree
		defaultExpandAll
		showLine
		treeData={treeData}
		className="selectable-tree"
	/>
));

MemoizedTree.displayName = 'MemoizedTree';

// Body Content Component
const BodyContent: React.FC<{
	fieldData: Record<string, string>;
	record: DataType;
	bodyHtml: { __html: string };
}> = React.memo(({ fieldData, record, bodyHtml }) => {
	const { isLoading, treeData, error } = useAsyncJSONProcessing(
		fieldData.value,
		record.field === 'body',
	);

	// Show JSON tree if available, otherwise show HTML content
	if (record.field === 'body' && treeData) {
		return <MemoizedTree treeData={treeData} />;
	}

	if (record.field === 'body' && isLoading) {
		return (
			<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
				<Spin size="small" />
				<span style={{ color: Color.BG_SIENNA_400 }}>Processing JSON...</span>
			</div>
		);
	}

	if (record.field === 'body' && error) {
		return (
			<span
				style={{ color: Color.BG_SIENNA_400, whiteSpace: 'pre-wrap', tabSize: 4 }}
			>
				Error parsing Body JSON
			</span>
		);
	}

	if (record.field === 'body') {
		return (
			<span
				style={{ color: Color.BG_SIENNA_400, whiteSpace: 'pre-wrap', tabSize: 4 }}
			>
				<span dangerouslySetInnerHTML={bodyHtml} />
			</span>
		);
	}

	return null;
});

BodyContent.displayName = 'BodyContent';

export default function TableViewActions(
	props: ITableViewActionsProps,
): React.ReactElement {
	const {
		fieldData,
		record,
		isListViewPanel,
		isfilterInLoading,
		isfilterOutLoading,
		onClickHandler,
		onGroupByAttribute,
	} = props;

	const { pathname } = useLocation();
	const { dataType, logType: fieldType } = getFieldAttributes(record.field);

	// there is no option for where clause in old logs explorer and live logs page
	const isOldLogsExplorerOrLiveLogsPage = useMemo(
		() => pathname === ROUTES.OLD_LOGS_EXPLORER || pathname === ROUTES.LIVE_LOGS,
		[pathname],
	);

	const [isOpen, setIsOpen] = useState<boolean>(false);

	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	// Memoize bodyHtml computation
	const bodyHtml = useMemo(() => {
		if (record.field !== 'body') return { __html: '' };

		return {
			__html: getSanitizedLogBody(record.value, { shouldEscapeHtml: true }),
		};
	}, [record.field, record.value]);

	const fieldFilterKey = filterKeyForField(fieldData.field);

	// Memoize textToCopy computation
	const textToCopy = useMemo(() => {
		let text = fieldData.value;
		try {
			text = text.replace(/^"|"$/g, '');
		} catch (error) {
			console.error(
				'Failed to remove starting and ending quotes from the value',
				error,
			);
		}
		return text;
	}, [fieldData.value]);

	// Memoize cleanTimestamp computation
	const cleanTimestamp = useMemo(() => {
		if (record.field !== 'timestamp') return '';
		return fieldData.value.replace(/^["']|["']$/g, '');
	}, [record.field, fieldData.value]);

	const renderFieldContent = useCallback((): JSX.Element => {
		const commonStyles: React.CSSProperties = {
			color: Color.BG_SIENNA_400,
			whiteSpace: 'pre-wrap',
			tabSize: 4,
		};

		switch (record.field) {
			case 'body':
				return (
					<BodyContent fieldData={fieldData} record={record} bodyHtml={bodyHtml} />
				);

			case 'timestamp':
				return (
					<span style={commonStyles}>
						{formatTimezoneAdjustedTimestamp(
							cleanTimestamp,
							DATE_TIME_FORMATS.UTC_US_MS,
						)}
					</span>
				);

			default:
				return (
					<span style={commonStyles}>{removeEscapeCharacters(fieldData.value)}</span>
				);
		}
	}, [
		record,
		fieldData,
		bodyHtml,
		formatTimezoneAdjustedTimestamp,
		cleanTimestamp,
	]);

	// Early return for body field with async processing
	if (record.field === 'body') {
		return (
			<div className={cx('value-field', isOpen ? 'open-popover' : '')}>
				<CopyClipboardHOC entityKey={fieldFilterKey} textToCopy={textToCopy}>
					<BodyContent fieldData={fieldData} record={record} bodyHtml={bodyHtml} />
				</CopyClipboardHOC>
				{!isListViewPanel && !RESTRICTED_SELECTED_FIELDS.includes(fieldFilterKey) && (
					<span className="action-btn">
						<Tooltip title="Filter for value">
							<Button
								className="filter-btn periscope-btn"
								icon={
									isfilterInLoading ? (
										<Spin size="small" />
									) : (
										<ArrowDownToDot size={14} style={{ transform: 'rotate(90deg)' }} />
									)
								}
								onClick={onClickHandler(
									OPERATORS['='],
									fieldFilterKey,
									parseFieldValue(fieldData.value),
									dataType,
									fieldType,
								)}
							/>
						</Tooltip>
						<Tooltip title="Filter out value">
							<Button
								className="filter-btn periscope-btn"
								icon={
									isfilterOutLoading ? (
										<Spin size="small" />
									) : (
										<ArrowUpFromDot size={14} style={{ transform: 'rotate(90deg)' }} />
									)
								}
								onClick={onClickHandler(
									OPERATORS['!='],
									fieldFilterKey,
									parseFieldValue(fieldData.value),
									dataType,
									fieldType,
								)}
							/>
						</Tooltip>
						{!isOldLogsExplorerOrLiveLogsPage && (
							<Popover
								open={isOpen}
								onOpenChange={setIsOpen}
								arrow={false}
								content={
									<div>
										<Button
											className="group-by-clause"
											type="text"
											icon={<GroupByIcon />}
											onClick={(): Promise<void> | void =>
												onGroupByAttribute?.(fieldFilterKey)
											}
										>
											Group By Attribute
										</Button>
									</div>
								}
								rootClassName="table-view-actions-content"
								trigger="hover"
								placement="bottomLeft"
							>
								<Button
									icon={<Ellipsis size={14} />}
									className="filter-btn periscope-btn"
								/>
							</Popover>
						)}
					</span>
				)}
			</div>
		);
	}

	return (
		<div className={cx('value-field', isOpen ? 'open-popover' : '')}>
			<CopyClipboardHOC entityKey={fieldFilterKey} textToCopy={textToCopy}>
				{renderFieldContent()}
			</CopyClipboardHOC>
			{!isListViewPanel && !RESTRICTED_SELECTED_FIELDS.includes(fieldFilterKey) && (
				<span className="action-btn">
					<Tooltip title="Filter for value">
						<Button
							className="filter-btn periscope-btn"
							icon={
								isfilterInLoading ? (
									<Spin size="small" />
								) : (
									<ArrowDownToDot size={14} style={{ transform: 'rotate(90deg)' }} />
								)
							}
							onClick={onClickHandler(
								OPERATORS['='],
								fieldFilterKey,
								parseFieldValue(fieldData.value),
								dataType,
								fieldType,
							)}
						/>
					</Tooltip>
					<Tooltip title="Filter out value">
						<Button
							className="filter-btn periscope-btn"
							icon={
								isfilterOutLoading ? (
									<Spin size="small" />
								) : (
									<ArrowUpFromDot size={14} style={{ transform: 'rotate(90deg)' }} />
								)
							}
							onClick={onClickHandler(
								OPERATORS['!='],
								fieldFilterKey,
								parseFieldValue(fieldData.value),
								dataType,
								fieldType,
							)}
						/>
					</Tooltip>
					{!isOldLogsExplorerOrLiveLogsPage && (
						<Popover
							open={isOpen}
							onOpenChange={setIsOpen}
							arrow={false}
							content={
								<div>
									<Button
										className="group-by-clause"
										type="text"
										icon={<GroupByIcon />}
										onClick={(): Promise<void> | void =>
											onGroupByAttribute?.(fieldFilterKey)
										}
									>
										Group By Attribute
									</Button>
								</div>
							}
							rootClassName="table-view-actions-content"
							trigger="hover"
							placement="bottomLeft"
						>
							<Button
								icon={<Ellipsis size={14} />}
								className="filter-btn periscope-btn"
							/>
						</Popover>
					)}
				</span>
			)}
		</div>
	);
}

TableViewActions.defaultProps = {
	onGroupByAttribute: undefined,
};
