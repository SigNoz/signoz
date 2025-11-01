import { Button, Popover, Spin, Tooltip } from 'antd';
import cx from 'classnames';
import { OPERATORS } from 'constants/antlrQueryConstants';
import { useTraceActions } from 'hooks/trace/useTraceActions';
import { ArrowDownToDot, ArrowUpFromDot, Copy, Ellipsis } from 'lucide-react';
import { useCallback, useState } from 'react';

// Field mapping from display names to actual span property keys
const SPAN_FIELD_MAPPING: Record<string, string> = {
	'span name': 'name',
	'span id': 'span_id',
	duration: 'durationNano',
	service: 'serviceName',
	'span kind': 'spanKind',
	'status code string': 'statusCodeString',
	'status message': 'statusMessage',
};

interface SpanFieldActionsProps {
	fieldDisplayName: string;
	fieldValue: string;
}

export default function SpanFieldActions({
	fieldDisplayName,
	fieldValue,
}: SpanFieldActionsProps): JSX.Element {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [isFilterInLoading, setIsFilterInLoading] = useState<boolean>(false);
	const [isFilterOutLoading, setIsFilterOutLoading] = useState<boolean>(false);

	const { onAddToQuery, onCopyFieldName, onCopyFieldValue } = useTraceActions();

	const mappedFieldKey =
		SPAN_FIELD_MAPPING[fieldDisplayName] || fieldDisplayName;

	const handleFilter = useCallback(
		async (operator: string, isFilterIn: boolean): Promise<void> => {
			const isLoading = isFilterIn ? isFilterInLoading : isFilterOutLoading;
			const setLoading = isFilterIn ? setIsFilterInLoading : setIsFilterOutLoading;

			if (!onAddToQuery || isLoading) return;
			setLoading(true);
			try {
				await onAddToQuery(mappedFieldKey, fieldValue, operator);
			} finally {
				setLoading(false);
			}
		},
		[
			onAddToQuery,
			mappedFieldKey,
			fieldValue,
			isFilterInLoading,
			isFilterOutLoading,
		],
	);

	const handleFilterIn = useCallback(() => handleFilter(OPERATORS['='], true), [
		handleFilter,
	]);

	const handleFilterOut = useCallback(
		() => handleFilter(OPERATORS['!='], false),
		[handleFilter],
	);

	const handleCopy = useCallback(
		(copyFn: ((value: string) => void) | undefined, value: string): void => {
			if (copyFn) {
				copyFn(value);
			}
			setIsOpen(false);
		},
		[],
	);

	const handleCopyFieldName = useCallback(
		() => handleCopy(onCopyFieldName, mappedFieldKey),
		[handleCopy, onCopyFieldName, mappedFieldKey],
	);

	const handleCopyFieldValue = useCallback(
		() => handleCopy(onCopyFieldValue, fieldValue),
		[fieldValue, handleCopy, onCopyFieldValue],
	);

	const moreActionsContent = (
		<div className="attribute-actions-menu">
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
