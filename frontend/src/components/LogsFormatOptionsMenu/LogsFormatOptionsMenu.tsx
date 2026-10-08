import { useCallback, useEffect, useState } from 'react';
import { Popover, Tooltip } from 'antd';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import cx from 'classnames';
import {
	LogViewMode,
	FontSize,
	OptionsMenuConfig,
} from 'container/OptionsMenu/types';
import {
	Check,
	ChevronLeft,
	ChevronRight,
	Minus,
	Plus,
	SlidersVertical,
} from '@signozhq/icons';

import './LogsFormatOptionsMenu.styles.scss';

const MIN_LINES_PER_ROW = 1;
const MAX_LINES_PER_ROW = 10;
const FONT_SIZES = [FontSize.SMALL, FontSize.MEDIUM, FontSize.LARGE];

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

	const handleLinesPerRowChange = (value: number | null): void => {
		if (value !== null) {
			setMaxLinesPerRow(
				Math.min(Math.max(value, MIN_LINES_PER_ROW), MAX_LINES_PER_ROW),
			);
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
						variant="link"
						color="secondary"
						size="sm"
						width="100%"
						data-format-menu="back"
						testId="font-size-back"
						prefix={<ChevronLeft size={14} />}
						onClick={(): void => setIsFontSizeOptionsOpen(false)}
					>
						Select font size
					</Button>
					<div className="horizontal-line" />
					<div className="content">
						{FONT_SIZES.map((size) => (
							<Button
								key={size}
								variant="link"
								color="secondary"
								size="sm"
								width="100%"
								data-format-menu="font-option"
								testId={`font-size-option-${size}`}
								onClick={(): void => setFontSizeValue(size)}
							>
								<span className="menu-row">
									{size}
									{fontSizeValue === size && <Check size={14} />}
								</span>
							</Button>
						))}
					</div>
				</div>
			) : (
				<div>
					<div className="font-size-container">
						<div className="title">Font Size</div>
						<Button
							variant="link"
							color="secondary"
							size="sm"
							width="100%"
							data-format-menu="font-size"
							testId="font-size-select"
							onClick={(): void => {
								setIsFontSizeOptionsOpen(true);
							}}
						>
							<span className="menu-row">
								{fontSizeValue}
								<ChevronRight size={14} />
							</span>
						</Button>
					</div>
					<div className="horizontal-line" />
					<div className="menu-container">
						<div className="title">FORMAT</div>

						<div className="menu-items">
							{items.map((item: any): JSX.Element => (
								<div
									className="item"
									key={item.label}
									data-testid={`format-option-${item.key}`}
									onClick={(): void => handleMenuItemClick(item.key)}
								>
									<div className={cx('item-label')}>
										{item.label}

										{selectedItem === item.key && <Check size={12} />}
									</div>
								</div>
							))}
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
										aria-label="Fewer lines per row"
										onClick={(): void => handleLinesPerRowChange(maxLinesPerRow - 1)}
									>
										<Minus size={12} />
									</button>
									<Input.Number
										min={MIN_LINES_PER_ROW}
										max={MAX_LINES_PER_ROW}
										format={{ maximumFractionDigits: 0 }}
										value={maxLinesPerRow}
										onChange={handleLinesPerRowChange}
										controls={false}
										noFocusRing
										aria-label="Max lines per row"
										testId="max-lines-per-row"
									/>
									<button
										type="button"
										className="periscope-btn"
										aria-label="More lines per row"
										onClick={(): void => handleLinesPerRowChange(maxLinesPerRow + 1)}
									>
										<Plus size={12} />
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
									variant="link"
									color="secondary"
									size="sm"
									width="100%"
									data-format-menu="edit-columns"
									onClick={handleEditColumns}
									testId="periscope-btn-edit-columns"
								>
									<span className="menu-row">
										Edit columns
										<ChevronRight size={14} />
									</span>
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
					variant="ghost"
					color="secondary"
					size="sm"
					icon
					aria-label="Options"
					testId="periscope-btn-format-options"
				>
					<SlidersVertical size={14} />
				</Button>
			</Tooltip>
		</Popover>
	);
}

export default LogsFormatOptionsMenu;
