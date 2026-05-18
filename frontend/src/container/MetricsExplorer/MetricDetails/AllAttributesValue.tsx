import { useCallback, useMemo, useRef, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { Check, Copy, Search, SquareArrowOutUpRight } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { Input, Menu, Popover, Tooltip } from 'antd';

import MetricDetailsErrorState from './MetricDetailsErrorState';
import { AllAttributesEmptyTextProps, AllAttributesValueProps } from './types';

const INITIAL_VISIBLE_COUNT = 5;
const COPY_FEEDBACK_DURATION_MS = 1500;

export function AllAttributesEmptyText({
	isErrorAttributes,
	refetchAttributes,
}: AllAttributesEmptyTextProps): JSX.Element {
	if (isErrorAttributes) {
		return (
			<div className="all-attributes-error-state">
				<MetricDetailsErrorState
					refetch={refetchAttributes}
					errorMessage="Something went wrong while fetching attributes"
				/>
			</div>
		);
	}
	return <Typography.Text>No attributes found</Typography.Text>;
}

export function AllAttributesValue({
	filterKey,
	filterValue,
	goToMetricsExploreWithAppliedAttribute,
}: AllAttributesValueProps): JSX.Element {
	const [attributePopoverKey, setAttributePopoverKey] = useState<string | null>(
		null,
	);
	const [allValuesOpen, setAllValuesOpen] = useState(false);
	const [allValuesSearch, setAllValuesSearch] = useState('');
	const [copiedValue, setCopiedValue] = useState<string | null>(null);
	const [, copyToClipboard] = useCopyToClipboard();
	const copyTimerRef = useRef<ReturnType<typeof setTimeout>>();

	const handleCopyWithFeedback = useCallback(
		(value: string): void => {
			copyToClipboard(value);
			setCopiedValue(value);
			clearTimeout(copyTimerRef.current);
			copyTimerRef.current = setTimeout(() => {
				setCopiedValue(null);
			}, COPY_FEEDBACK_DURATION_MS);
		},
		[copyToClipboard],
	);

	const handleMenuItemClick = useCallback(
		(key: string, attribute: string): void => {
			switch (key) {
				case 'open-in-explorer':
					goToMetricsExploreWithAppliedAttribute(filterKey, attribute);
					break;
				case 'copy-value':
					handleCopyWithFeedback(attribute);
					break;
				default:
					break;
			}
			setAttributePopoverKey(null);
		},
		[goToMetricsExploreWithAppliedAttribute, filterKey, handleCopyWithFeedback],
	);

	const attributePopoverContent = useCallback(
		(attribute: string) => (
			<Menu
				items={[
					{
						icon: <SquareArrowOutUpRight size={14} />,
						label: 'Open in Metric Explorer',
						key: 'open-in-explorer',
					},
					{
						icon: <Copy size={14} />,
						label: 'Copy Value',
						key: 'copy-value',
					},
				]}
				onClick={(info): void => {
					handleMenuItemClick(info.key, attribute);
				}}
			/>
		),
		[handleMenuItemClick],
	);

	const filteredAllValues = useMemo(
		() =>
			allValuesSearch
				? filterValue.filter((v) =>
						v.toLowerCase().includes(allValuesSearch.toLowerCase()),
					)
				: filterValue,
		[filterValue, allValuesSearch],
	);

	const allValuesPopoverContent = (
		<div className="all-values-popover">
			<Input
				placeholder="Search values"
				size="small"
				prefix={<Search size={12} />}
				value={allValuesSearch}
				onChange={(e): void => setAllValuesSearch(e.target.value)}
				allowClear
			/>
			<div className="all-values-list">
				{allValuesOpen &&
					filteredAllValues.map((attribute) => {
						const isCopied = copiedValue === attribute;
						return (
							<div key={attribute} className="all-values-item">
								<Typography.Text truncate={1} className="all-values-item-text">
									{attribute}
								</Typography.Text>
								<div className="all-values-item-actions">
									<Tooltip title={isCopied ? 'Copied!' : 'Copy value'}>
										<Button
											className={isCopied ? 'copy-success' : ''}
											onClick={(): void => {
												handleCopyWithFeedback(attribute);
											}}
											size="sm"
											variant="ghost"
											prefix={isCopied ? <Check size={12} /> : <Copy size={12} />}
										/>
									</Tooltip>
									<Tooltip title="Open in Metric Explorer">
										<Button
											onClick={(): void => {
												goToMetricsExploreWithAppliedAttribute(filterKey, attribute);
												setAllValuesOpen(false);
											}}
											size="sm"
											variant="ghost"
											prefix={<SquareArrowOutUpRight size={12} />}
										/>
									</Tooltip>
								</div>
							</div>
						);
					})}
				{allValuesOpen && filteredAllValues.length === 0 && (
					<Typography.Text color="muted" className="all-values-empty">
						No values found
					</Typography.Text>
				)}
			</div>
		</div>
	);

	return (
		<div className="all-attributes-value">
			{filterValue.slice(0, INITIAL_VISIBLE_COUNT).map((attribute) => {
				const isCopied = copiedValue === attribute;
				return (
					<div key={attribute} className="all-attributes-value-item">
						<Popover
							content={attributePopoverContent(attribute)}
							trigger="click"
							overlayClassName="metric-details-popover attribute-value-popover-overlay"
							open={attributePopoverKey === `${filterKey}-${attribute}`}
							onOpenChange={(open): void => {
								if (!open) {
									setAttributePopoverKey(null);
								} else {
									setAttributePopoverKey(`${filterKey}-${attribute}`);
								}
							}}
						>
							<Button variant="ghost">
								<Typography.Text>{attribute}</Typography.Text>
							</Button>
						</Popover>
						{isCopied && (
							<span className="copy-feedback">
								<Check size={12} />
							</span>
						)}
					</div>
				);
			})}
			{filterValue.length > INITIAL_VISIBLE_COUNT && (
				<Popover
					content={allValuesPopoverContent}
					trigger="click"
					open={allValuesOpen}
					onOpenChange={(open): void => {
						setAllValuesOpen(open);
						if (!open) {
							setAllValuesSearch('');
							setCopiedValue(null);
						}
					}}
					overlayClassName="metric-details-popover all-values-popover-overlay"
				>
					<Button className="all-values-button" variant="ghost">
						All values ({filterValue.length})
					</Button>
				</Popover>
			)}
		</div>
	);
}
