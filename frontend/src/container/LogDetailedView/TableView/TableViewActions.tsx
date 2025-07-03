/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable react/display-name */
/* eslint-disable sonarjs/cognitive-complexity */
import './TableViewActions.styles.scss';

import { Color } from '@signozhq/design-tokens';
import Convert from 'ansi-to-html';
import { Button, Popover, Spin, Tooltip, Tree } from 'antd';
import GroupByIcon from 'assets/CustomIcons/GroupByIcon';
import cx from 'classnames';
import CopyClipboardHOC from 'components/Logs/CopyClipboardHOC';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { OPERATORS } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { RESTRICTED_SELECTED_FIELDS } from 'container/LogsFilters/config';
import dompurify from 'dompurify';
import { isEmpty } from 'lodash-es';
import { ArrowDownToDot, ArrowUpFromDot, Ellipsis } from 'lucide-react';
import { useTimezone } from 'providers/Timezone';
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { FORBID_DOM_PURIFY_TAGS } from 'utils/app';

import { DataType } from '../TableView';
import {
	escapeHtml,
	filterKeyForField,
	getFieldAttributes,
	jsonToDataNodes,
	parseFieldValue,
	recursiveParseJSON,
	removeEscapeCharacters,
	unescapeString,
} from '../utils';

interface ITableViewActionsProps {
	fieldData: Record<string, string>;
	record: DataType;
	isListViewPanel: boolean;
	isfilterInLoading: boolean;
	isfilterOutLoading: boolean;
	onGroupByAttribute?: (
		fieldKey: string,
		isJSON?: boolean,
		dataType?: DataTypes,
	) => Promise<void>;
	onClickHandler: (
		operator: string,
		fieldKey: string,
		fieldValue: string,
		dataType: string | undefined,
	) => () => void;
}

const convert = new Convert();

// Hook for async JSON processing
const useAsyncJSONProcessing = (
	value: string,
	shouldProcess: boolean,
): {
	isLoading: boolean;
	treeData: any[] | null;
	error: string | null;
} => {
	const [state, setState] = useState<{
		isLoading: boolean;
		treeData: any[] | null;
		error: string | null;
	}>({
		isLoading: false,
		treeData: null,
		error: null,
	});

	const processingRef = useRef<boolean>(false);

	useEffect((): (() => void) => {
		if (!shouldProcess || processingRef.current) {
			return (): void => {};
		}

		processingRef.current = true;
		setState({ isLoading: true, treeData: null, error: null });

		// Option 1: Using setTimeout for non-blocking processing
		const processAsync = (): void => {
			setTimeout(() => {
				try {
					const parsedBody = recursiveParseJSON(value);
					if (!isEmpty(parsedBody)) {
						const treeData = jsonToDataNodes(parsedBody);
						setState({ isLoading: false, treeData, error: null });
					} else {
						setState({ isLoading: false, treeData: null, error: null });
					}
				} catch (error) {
					setState({
						isLoading: false,
						treeData: null,
						error: error instanceof Error ? error.message : 'Parsing failed',
					});
				} finally {
					processingRef.current = false;
				}
			}, 0);
		};

		// Option 2: Using requestIdleCallback for better performance
		const processWithIdleCallback = (): void => {
			if ('requestIdleCallback' in window) {
				requestIdleCallback(
					(): void => {
						try {
							const parsedBody = recursiveParseJSON(value);
							if (!isEmpty(parsedBody)) {
								const treeData = jsonToDataNodes(parsedBody);
								setState({ isLoading: false, treeData, error: null });
							} else {
								setState({ isLoading: false, treeData: null, error: null });
							}
						} catch (error) {
							setState({
								isLoading: false,
								treeData: null,
								error: error instanceof Error ? error.message : 'Parsing failed',
							});
						} finally {
							processingRef.current = false;
						}
					},
					{ timeout: 1000 },
				);
			} else {
				processAsync();
			}
		};

		processWithIdleCallback();

		// Cleanup function
		return (): void => {
			processingRef.current = false;
		};
	}, [value, shouldProcess]);

	return state;
};

// Memoized Tree Component
const MemoizedTree = React.memo<{ treeData: any[] }>(({ treeData }) => (
	<Tree defaultExpandAll showLine treeData={treeData} />
));

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
	const { dataType } = getFieldAttributes(record.field);

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
			__html: convert.toHtml(
				dompurify.sanitize(unescapeString(escapeHtml(record.value)), {
					FORBID_TAGS: [...FORBID_DOM_PURIFY_TAGS],
				}),
			),
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
