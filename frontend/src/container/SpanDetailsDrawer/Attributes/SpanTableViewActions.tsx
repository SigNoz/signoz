import { Color } from '@signozhq/design-tokens';
import { Button, Popover, Spin, Tooltip } from 'antd';
import GroupByIcon from 'assets/CustomIcons/GroupByIcon';
import cx from 'classnames';
import CopyClipboardHOC from 'components/Logs/CopyClipboardHOC';
import { ArrowDownToDot, ArrowUpFromDot, Copy, Ellipsis } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { SpanDataType } from './SpanTableView';

interface SpanTableViewActionsProps {
	record: SpanDataType;
	onAddToQuery?: (key: string, value: string, operator: string) => void;
	onGroupByAttribute?: (fieldKey: string) => void;
	onCopyFieldName?: (fieldName: string) => void;
	onCopyFieldValue?: (fieldValue: string) => void;
}

export default function SpanTableViewActions({
	record,
	onAddToQuery,
	onGroupByAttribute,
	onCopyFieldName,
	onCopyFieldValue,
}: SpanTableViewActionsProps): JSX.Element {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [isFilterInLoading, setIsFilterInLoading] = useState<boolean>(false);
	const [isFilterOutLoading, setIsFilterOutLoading] = useState<boolean>(false);

	const textToCopy = useMemo(() => {
		let text = record.value;
		try {
			text = text.replace(/^"|"$/g, '');
		} catch (error) {
			console.error(
				'Failed to remove starting and ending quotes from the value',
				error,
			);
		}
		return text;
	}, [record.value]);

	const handleFilterIn = useCallback((): void => {
		if (onAddToQuery) {
			setIsFilterInLoading(true);
			onAddToQuery(record.field, record.value, '=');
			setTimeout(() => setIsFilterInLoading(false), 1000);
		}
	}, [onAddToQuery, record.field, record.value]);

	const handleFilterOut = useCallback((): void => {
		if (onAddToQuery) {
			setIsFilterOutLoading(true);
			onAddToQuery(record.field, record.value, '!=');
			setTimeout(() => setIsFilterOutLoading(false), 1000);
		}
	}, [onAddToQuery, record.field, record.value]);

	const handleGroupBy = useCallback((): void => {
		if (onGroupByAttribute) {
			onGroupByAttribute(record.field);
		}
		setIsOpen(false);
	}, [onGroupByAttribute, record.field]);

	const handleCopyFieldName = useCallback((): void => {
		if (onCopyFieldName) {
			onCopyFieldName(record.field);
		}
		setIsOpen(false);
	}, [onCopyFieldName, record.field]);

	const handleCopyFieldValue = useCallback((): void => {
		if (onCopyFieldValue) {
			onCopyFieldValue(record.value);
		}
		setIsOpen(false);
	}, [onCopyFieldValue, record.value]);

	const renderFieldContent = useCallback(
		(): JSX.Element => (
			<span
				style={{
					color: Color.BG_SIENNA_400,
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-word',
				}}
			>
				{record.value}
			</span>
		),
		[record.value],
	);

	const moreActionsContent = (
		<div className="span-table-actions-menu">
			<Button
				className="group-by-clause"
				type="text"
				icon={<GroupByIcon />}
				onClick={handleGroupBy}
				block
			>
				Group By Attribute
			</Button>
			<Button
				type="text"
				icon={<Copy size={14} />}
				onClick={handleCopyFieldName}
				block
			>
				Copy Field Name
			</Button>
			<Button
				type="text"
				icon={<Copy size={14} />}
				onClick={handleCopyFieldValue}
				block
			>
				Copy Field Value
			</Button>
		</div>
	);

	return (
		<div className={cx('value-field', isOpen ? 'open-popover' : '')}>
			<CopyClipboardHOC entityKey={record.field} textToCopy={textToCopy}>
				{renderFieldContent()}
			</CopyClipboardHOC>
			<span className="action-btn">
				<Tooltip title="Filter for value">
					<Button
						className="filter-btn periscope-btn"
						icon={
							isFilterInLoading ? (
								<Spin size="small" />
							) : (
								<ArrowDownToDot size={14} style={{ transform: 'rotate(90deg)' }} />
							)
						}
						onClick={handleFilterIn}
					/>
				</Tooltip>
				<Tooltip title="Filter out value">
					<Button
						className="filter-btn periscope-btn"
						icon={
							isFilterOutLoading ? (
								<Spin size="small" />
							) : (
								<ArrowUpFromDot size={14} style={{ transform: 'rotate(90deg)' }} />
							)
						}
						onClick={handleFilterOut}
					/>
				</Tooltip>
				<Popover
					open={isOpen}
					onOpenChange={setIsOpen}
					arrow={false}
					content={moreActionsContent}
					rootClassName="span-table-view-actions-content"
					trigger="hover"
					placement="bottomLeft"
				>
					<Button
						icon={<Ellipsis size={14} />}
						className="filter-btn periscope-btn"
					/>
				</Popover>
			</span>
		</div>
	);
}

SpanTableViewActions.defaultProps = {
	onAddToQuery: undefined,
	onGroupByAttribute: undefined,
	onCopyFieldName: undefined,
	onCopyFieldValue: undefined,
};
