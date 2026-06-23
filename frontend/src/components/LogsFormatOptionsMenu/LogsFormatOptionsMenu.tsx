import { useCallback, useEffect, useState } from 'react';
import { Button, InputNumber, Popover, Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
import { LogViewMode } from 'container/LogsTable';
import { FontSize, OptionsMenuConfig } from 'container/OptionsMenu/types';
import {
	Check,
	ChevronLeft,
	ChevronRight,
	Minus,
	Plus,
	SlidersVertical,
} from '@signozhq/icons';

import './LogsFormatOptionsMenu.styles.scss';

interface LogsFormatOptionsMenuProps {
	items: any;
	selectedOptionFormat: any;
	config: OptionsMenuConfig;
	onOpenColumns?: () => void;
}

interface OptionsMenuContentProps extends LogsFormatOptionsMenuProps {
	closePopover: () => void;
}

function OptionsMenu({
	items,
	selectedOptionFormat,
	config,
	onOpenColumns,
	closePopover,
}: OptionsMenuContentProps): JSX.Element {
	const { maxLines, format, fontSize } = config;
	const [selectedItem, setSelectedItem] = useState(selectedOptionFormat);
	const maxLinesNumber = (maxLines?.value as number) || 1;
	const [maxLinesPerRow, setMaxLinesPerRow] = useState<number>(maxLinesNumber);
	const [fontSizeValue, setFontSizeValue] = useState<FontSize>(
		fontSize?.value || FontSize.SMALL,
	);
	const [isFontSizeOptionsOpen, setIsFontSizeOptionsOpen] =
		useState<boolean>(false);

	const onChange = useCallback(
		(key: LogViewMode) => {
			if (!format) {
				return;
			}

			format.onChange(key);
		},
		[format],
	);

	const handleMenuItemClick = (key: LogViewMode): void => {
		setSelectedItem(key);
		onChange(key);
	};

	const incrementMaxLinesPerRow = (): void => {
		if (maxLinesPerRow < 10) {
			setMaxLinesPerRow(maxLinesPerRow + 1);
		}
	};

	const decrementMaxLinesPerRow = (): void => {
		if (maxLinesPerRow > 1) {
			setMaxLinesPerRow(maxLinesPerRow - 1);
		}
	};

	const handleLinesPerRowChange = (maxLinesPerRow: number | null): void => {
		if (
			maxLinesPerRow &&
			Number.isInteger(maxLinesNumber) &&
			maxLinesPerRow > 1
		) {
			setMaxLinesPerRow(maxLinesPerRow);
		}
	};

	const handleEditColumns = (): void => {
		onOpenColumns?.();
		closePopover();
	};

	useEffect(() => {
		if (maxLinesPerRow && config && config.maxLines?.onChange) {
			config.maxLines.onChange(maxLinesPerRow);
		}
	}, [maxLinesPerRow]);

	useEffect(() => {
		if (fontSizeValue && config && config.fontSize?.onChange) {
			config.fontSize.onChange(fontSizeValue);
		}
	}, [fontSizeValue]);

	return (
		<div
			className="nested-menu-container"
			onClick={(event): void => {
				event.stopPropagation();
			}}
		>
			{isFontSizeOptionsOpen ? (
				<div className="font-size-dropdown">
					<Button
						onClick={(): void => setIsFontSizeOptionsOpen(false)}
						className="back-btn"
						type="text"
					>
						<ChevronLeft size={14} className="icon" />
						<Typography.Text className="text">Select font size</Typography.Text>
					</Button>
					<div className="horizontal-line" />
					<div className="content">
						<Button
							onClick={(): void => {
								setFontSizeValue(FontSize.SMALL);
							}}
							className="option-btn"
							type="text"
						>
							<Typography.Text className="text">{FontSize.SMALL}</Typography.Text>
							{fontSizeValue === FontSize.SMALL && (
								<Check size={14} className="icon" />
							)}
						</Button>
						<Button
							onClick={(): void => {
								setFontSizeValue(FontSize.MEDIUM);
							}}
							className="option-btn"
							type="text"
						>
							<Typography.Text className="text">{FontSize.MEDIUM}</Typography.Text>
							{fontSizeValue === FontSize.MEDIUM && (
								<Check size={14} className="icon" />
							)}
						</Button>
						<Button
							onClick={(): void => {
								setFontSizeValue(FontSize.LARGE);
							}}
							className="option-btn"
							type="text"
						>
							<Typography.Text className="text">{FontSize.LARGE}</Typography.Text>
							{fontSizeValue === FontSize.LARGE && (
								<Check size={14} className="icon" />
							)}
						</Button>
					</div>
				</div>
			) : (
				<div>
					<div className="font-size-container">
						<div className="title">Font Size</div>
						<Button
							className="value"
							type="text"
							onClick={(): void => {
								setIsFontSizeOptionsOpen(true);
							}}
						>
							<Typography.Text className="font-value">{fontSizeValue}</Typography.Text>
							<ChevronRight size={14} className="icon" />
						</Button>
					</div>
					<div className="horizontal-line" />
					<div className="menu-container">
						<div className="title">FORMAT</div>

						<div className="menu-items">
							{items.map(
								(item: any): JSX.Element => (
									<div
										className="item"
										key={item.label}
										onClick={(): void => handleMenuItemClick(item.key)}
									>
										<div className={cx('item-label')}>
											{item.label}

											{selectedItem === item.key && <Check size={12} />}
										</div>
									</div>
								),
							)}
						</div>
					</div>

					{selectedItem && (
						<>
							<div className="horizontal-line" />
							<div className="max-lines-per-row">
								<div className="title"> max lines per row </div>
								<div className="raw-format max-lines-per-row-input">
									<button
										type="button"
										className="periscope-btn"
										onClick={decrementMaxLinesPerRow}
									>
										{' '}
										<Minus size={12} />{' '}
									</button>
									<InputNumber
										min={1}
										max={10}
										value={maxLinesPerRow}
										onChange={handleLinesPerRowChange}
									/>
									<button
										type="button"
										className="periscope-btn"
										onClick={incrementMaxLinesPerRow}
									>
										{' '}
										<Plus size={12} />{' '}
									</button>
								</div>
							</div>
						</>
					)}

					{selectedItem === 'table' && onOpenColumns && (
						<>
							<div className="horizontal-line" />
							<div className="edit-columns-container">
								<Button
									className="edit-columns-btn"
									type="text"
									onClick={handleEditColumns}
									data-testid="periscope-btn-edit-columns"
								>
									<Typography.Text className="edit-columns-text">
										Edit columns
									</Typography.Text>
									<ChevronRight size={14} className="icon" />
								</Button>
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
}

function LogsFormatOptionsMenu({
	items,
	selectedOptionFormat,
	config,
	onOpenColumns,
}: LogsFormatOptionsMenuProps): JSX.Element {
	const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
	return (
		<Popover
			content={
				<OptionsMenu
					items={items}
					selectedOptionFormat={selectedOptionFormat}
					config={config}
					onOpenColumns={onOpenColumns}
					closePopover={(): void => setIsPopoverOpen(false)}
				/>
			}
			trigger="click"
			placement="bottomRight"
			arrow={false}
			open={isPopoverOpen}
			onOpenChange={setIsPopoverOpen}
			rootClassName="format-options-popover"
			destroyTooltipOnHide
		>
			<Tooltip title="Options">
				<Button
					className="periscope-btn ghost"
					icon={<SlidersVertical size="md" />}
					data-testid="periscope-btn-format-options"
				/>
			</Tooltip>
		</Popover>
	);
}

export default LogsFormatOptionsMenu;
