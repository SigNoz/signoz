import { Button, Popover, Spin, Tooltip } from 'antd';
import GroupByIcon from 'assets/CustomIcons/GroupByIcon';
import cx from 'classnames';
import { OPERATORS } from 'constants/antlrQueryConstants';
import { useTraceActions } from 'hooks/trace/useTraceActions';
import {
	ArrowDownToDot,
	ArrowUpFromDot,
	Copy,
	Ellipsis,
	Pin,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

interface AttributeRecord {
	field: string;
	value: string;
}

interface AttributeActionsProps {
	record: AttributeRecord;
	isPinned?: boolean;
	onTogglePin: (fieldKey: string) => void;
}

export default function AttributeActions({
	record,
	isPinned,
	onTogglePin,
}: AttributeActionsProps): JSX.Element {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [isFilterInLoading, setIsFilterInLoading] = useState<boolean>(false);
	const [isFilterOutLoading, setIsFilterOutLoading] = useState<boolean>(false);

	const {
		onAddToQuery,
		onGroupByAttribute,
		onCopyFieldName,
		onCopyFieldValue,
	} = useTraceActions();

	const textToCopy = useMemo(() => {
		const str = record.value == null ? '' : String(record.value);
		// Remove surrounding double-quotes only (e.g., JSON-encoded string values)
		return str.replace(/^"|"$/g, '');
	}, [record.value]);

	const handleFilterIn = useCallback(async (): Promise<void> => {
		if (!onAddToQuery || isFilterInLoading) return;
		setIsFilterInLoading(true);
		try {
			await Promise.resolve(
				onAddToQuery(record.field, record.value, OPERATORS['=']),
			);
		} finally {
			setIsFilterInLoading(false);
		}
	}, [onAddToQuery, record.field, record.value, isFilterInLoading]);

	const handleFilterOut = useCallback(async (): Promise<void> => {
		if (!onAddToQuery || isFilterOutLoading) return;
		setIsFilterOutLoading(true);
		try {
			await Promise.resolve(
				onAddToQuery(record.field, record.value, OPERATORS['!=']),
			);
		} finally {
			setIsFilterOutLoading(false);
		}
	}, [onAddToQuery, record.field, record.value, isFilterOutLoading]);

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
			onCopyFieldValue(textToCopy);
		}
		setIsOpen(false);
	}, [onCopyFieldValue, textToCopy]);

	const handleTogglePin = useCallback((): void => {
		onTogglePin(record.field);
	}, [onTogglePin, record.field]);

	const moreActionsContent = (
		<div className="attribute-actions-menu">
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
		<div className={cx('action-btn', { 'action-btn--is-open': isOpen })}>
			<Tooltip title={isPinned ? 'Unpin attribute' : 'Pin attribute'}>
				<Button
					className={`filter-btn periscope-btn ${isPinned ? 'pinned' : ''}`}
					aria-label={isPinned ? 'Unpin attribute' : 'Pin attribute'}
					icon={<Pin size={14} fill={isPinned ? 'currentColor' : 'none'} />}
					onClick={handleTogglePin}
				/>
			</Tooltip>
			<Tooltip title="Filter for value">
				<Button
					className="filter-btn periscope-btn"
					aria-label="Filter for value"
					disabled={isFilterInLoading}
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
					aria-label="Filter out value"
					disabled={isFilterOutLoading}
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
				rootClassName="attribute-actions-content"
				trigger="hover"
				placement="bottomLeft"
			>
				<Button
					icon={<Ellipsis size={14} />}
					className="filter-btn periscope-btn"
				/>
			</Popover>
		</div>
	);
}

AttributeActions.defaultProps = {
	isPinned: false,
};
