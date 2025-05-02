/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './LogsFormatOptionsMenu.styles.scss';

import { Button, Input, InputNumber, Tooltip, Typography } from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import cx from 'classnames';
import { LogViewMode } from 'container/LogsTable';
import { FontSize, OptionsMenuConfig } from 'container/OptionsMenu/types';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { Check, ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface LogsFormatOptionsMenuProps {
	title: string;
	items: any;
	selectedOptionFormat: any;
	config: OptionsMenuConfig;
}

export default function LogsFormatOptionsMenu({
	title,
	items,
	selectedOptionFormat,
	config,
}: LogsFormatOptionsMenuProps): JSX.Element {
	const { maxLines, format, addColumn, fontSize } = config;
	const [selectedItem, setSelectedItem] = useState(selectedOptionFormat);
	const maxLinesNumber = (maxLines?.value as number) || 1;
	const [maxLinesPerRow, setMaxLinesPerRow] = useState<number>(maxLinesNumber);
	const [fontSizeValue, setFontSizeValue] = useState<FontSize>(
		fontSize?.value || FontSize.SMALL,
	);
	const [isFontSizeOptionsOpen, setIsFontSizeOptionsOpen] = useState<boolean>(
		false,
	);

	const [showAddNewColumnContainer, setShowAddNewColumnContainer] = useState(
		false,
	);

	const [selectedValue, setSelectedValue] = useState<string | null>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const initialMouseEnterRef = useRef<boolean>(false);

	const onChange = useCallback(
		(key: LogViewMode) => {
			if (!format) return;

			format.onChange(key);
		},
		[format],
	);

	const handleMenuItemClick = (key: LogViewMode): void => {
		setSelectedItem(key);
		onChange(key);
		setShowAddNewColumnContainer(false);
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

	const handleSearchValueChange = useDebouncedFn((event): void => {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		const value = event?.target?.value || '';

		if (addColumn && addColumn?.onSearch) {
			addColumn?.onSearch(value);
		}
	}, 300);

	const handleToggleAddNewColumn = (): void => {
		addColumn?.onSearch?.('');
		setShowAddNewColumnContainer(!showAddNewColumnContainer);
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

	function handleColumnSelection(
		currentIndex: number,
		optionsData: DefaultOptionType[],
	): void {
		const currentItem = optionsData[currentIndex];
		const itemLength = optionsData.length;
		if (addColumn && addColumn?.onSelect) {
			addColumn?.onSelect(selectedValue, {
				label: currentItem.label,
				disabled: false,
			});

			// if the last element is selected then select the previous one
			if (currentIndex === itemLength - 1) {
				// there should be more than 1 element in the list
				if (currentIndex - 1 >= 0) {
					const prevValue = optionsData[currentIndex - 1]?.value || null;
					setSelectedValue(prevValue as string | null);
				} else {
					// if there is only one element then just select and do nothing
					setSelectedValue(null);
				}
			} else {
				// selecting any random element from the list except the last one
				const nextIndex = currentIndex + 1;

				const nextValue = optionsData[nextIndex]?.value || null;

				setSelectedValue(nextValue as string | null);
			}
		}
	}

	const handleKeyDown = (e: KeyboardEvent): void => {
		if (!selectedValue) return;

		const optionsData = addColumn?.options || [];

		const currentIndex = optionsData.findIndex(
			(item) => item?.value === selectedValue,
		);

		const itemLength = optionsData.length;

		switch (e.key) {
			case 'ArrowUp': {
				const newValue = optionsData[Math.max(0, currentIndex - 1)]?.value;

				setSelectedValue(newValue as string | null);
				e.preventDefault();
				break;
			}
			case 'ArrowDown': {
				const newValue =
					optionsData[Math.min(itemLength - 1, currentIndex + 1)]?.value;

				setSelectedValue(newValue as string | null);
				e.preventDefault();
				break;
			}
			case 'Enter':
				e.preventDefault();
				handleColumnSelection(currentIndex, optionsData);
				break;
			default:
				break;
		}
	};

	useEffect(() => {
		// Scroll the selected item into view
		const listNode = listRef.current;
		if (listNode && selectedValue) {
			const optionsData = addColumn?.options || [];
			const currentIndex = optionsData.findIndex(
				(item) => item?.value === selectedValue,
			);
			const itemNode = listNode.children[currentIndex] as HTMLElement;
			if (itemNode) {
				itemNode.scrollIntoView({
					behavior: 'smooth',
					block: 'nearest',
				});
			}
		}
	}, [selectedValue]);

	useEffect(() => {
		window.addEventListener('keydown', handleKeyDown);
		return (): void => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [selectedValue]);

	return (
		<div
			className={cx(
				'nested-menu-container',
				showAddNewColumnContainer ? 'active' : '',
			)}
			onClick={(event): void => {
				// this is to restrict click events to propogate to parent
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
			) : null}

			{showAddNewColumnContainer && (
				<div className="add-new-column-container">
					<div className="add-new-column-header">
						<div className="title">
							<div className="periscope-btn ghost" onClick={handleToggleAddNewColumn}>
								<ChevronLeft
									size={14}
									className="back-icon"
									onClick={handleToggleAddNewColumn}
								/>
							</div>
							Add New Column
						</div>

						<Input
							tabIndex={0}
							type="text"
							autoFocus
							onFocus={addColumn?.onFocus}
							onChange={handleSearchValueChange}
							placeholder="Search..."
						/>
					</div>

					<div className="add-new-column-content">
						{addColumn?.isFetching && (
							<div className="loading-container"> Loading ... </div>
						)}

						<div className="column-format-new-options" ref={listRef}>
							{addColumn?.options?.map(({ label, value }, index) => (
								<div
									className={cx('column-name', value === selectedValue && 'selected')}
									key={value}
									onMouseEnter={(): void => {
										if (!initialMouseEnterRef.current) {
											setSelectedValue(value as string | null);
										}

										initialMouseEnterRef.current = true;
									}}
									onMouseMove={(): void => {
										// this is added to handle the mouse move explicit event and not the re-rendered on mouse enter event
										setSelectedValue(value as string | null);
									}}
									onClick={(eve): void => {
										eve.stopPropagation();
										handleColumnSelection(index, addColumn?.options || []);
									}}
								>
									<div className="name">
										<Tooltip placement="left" title={label}>
											{label}
										</Tooltip>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}

			{!isFontSizeOptionsOpen && !showAddNewColumnContainer && (
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
						<div className="title"> {title} </div>

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

							<div className="selected-item-content-container active">
								{!showAddNewColumnContainer && <div className="horizontal-line" />}

								<div className="item-content">
									{!showAddNewColumnContainer && (
										<div className="title">
											columns
											<Plus size={14} onClick={handleToggleAddNewColumn} />{' '}
										</div>
									)}

									<div className="column-format">
										{addColumn?.value?.map(({ key, id }) => (
											<div className="column-name" key={id}>
												<div className="name">
													<Tooltip placement="left" title={key}>
														{key}
													</Tooltip>
												</div>
												{addColumn?.value?.length > 1 && (
													<X
														className="delete-btn"
														size={14}
														onClick={(): void => addColumn.onRemove(id as string)}
													/>
												)}
											</div>
										))}
										{addColumn && addColumn?.value?.length === 0 && (
											<div className="column-name no-columns-selected">
												No columns selected
											</div>
										)}
									</div>
								</div>
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
}
