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
import dompurify from 'dompurify';
import { isEmpty } from 'lodash-es';
import { ArrowDownToDot, ArrowUpFromDot, Ellipsis } from 'lucide-react';
import { useTimezone } from 'providers/Timezone';
import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { FORBID_DOM_PURIFY_TAGS } from 'utils/app';

import { DataType } from '../TableView';
import {
	filterKeyForField,
	jsonToDataNodes,
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
	) => () => void;
}

const convert = new Convert();

export function TableViewActions(
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

	// there is no option for where clause in old logs explorer and live logs page
	const isOldLogsExplorerOrLiveLogsPage = useMemo(
		() => pathname === ROUTES.OLD_LOGS_EXPLORER || pathname === ROUTES.LIVE_LOGS,
		[pathname],
	);

	const [isOpen, setIsOpen] = useState<boolean>(false);

	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	if (record.field === 'body') {
		const parsedBody = recursiveParseJSON(fieldData.value);
		if (!isEmpty(parsedBody)) {
			return (
				<Tree defaultExpandAll showLine treeData={jsonToDataNodes(parsedBody)} />
			);
		}
	}
	const bodyHtml =
		record.field === 'body'
			? {
					__html: convert.toHtml(
						dompurify.sanitize(unescapeString(record.value), {
							FORBID_TAGS: [...FORBID_DOM_PURIFY_TAGS],
						}),
					),
			  }
			: { __html: '' };

	const fieldFilterKey = filterKeyForField(fieldData.field);
	let textToCopy = fieldData.value;

	// remove starting and ending quotes from the value
	try {
		textToCopy = textToCopy.replace(/^"|"$/g, '');
	} catch (error) {
		console.error(
			'Failed to remove starting and ending quotes from the value',
			error,
		);
	}

	let cleanTimestamp: string;
	if (record.field === 'timestamp') {
		cleanTimestamp = fieldData.value.replace(/^["']|["']$/g, '');
	}

	const renderFieldContent = (): JSX.Element => {
		const commonStyles: React.CSSProperties = {
			color: Color.BG_SIENNA_400,
			whiteSpace: 'pre-wrap',
			tabSize: 4,
		};

		switch (record.field) {
			case 'body':
				return <span style={commonStyles} dangerouslySetInnerHTML={bodyHtml} />;

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
	};

	return (
		<div className={cx('value-field', isOpen ? 'open-popover' : '')}>
			<CopyClipboardHOC entityKey={fieldFilterKey} textToCopy={textToCopy}>
				{renderFieldContent()}
			</CopyClipboardHOC>
			{!isListViewPanel && (
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
							onClick={onClickHandler(OPERATORS['='], fieldFilterKey, fieldData.value)}
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
								fieldData.value,
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
