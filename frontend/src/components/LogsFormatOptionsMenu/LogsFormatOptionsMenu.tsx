/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './LogsFormatOptionsMenu.styles.scss';

import { Button, Divider, Input, InputNumber, Tooltip, Typography } from 'antd';
import cx from 'classnames';
import { LogViewMode } from 'container/LogsTable';
import { FontSize, OptionsMenuConfig } from 'container/OptionsMenu/types';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { Check, ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

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

	const [addNewColumn, setAddNewColumn] = useState(false);

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
		setAddNewColumn(false);
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
		setAddNewColumn(!addNewColumn);
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

	return (
		<div
			className={cx('nested-menu-container', addNewColumn ? 'active' : '')}
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
			) : (
				<>
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
								{!addNewColumn && <div className="horizontal-line" />}

								{addNewColumn && (
									<div className="add-new-column-header">
										<div className="title">
											{' '}
											columns
											<X size={14} onClick={handleToggleAddNewColumn} />{' '}
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
								)}

								<div className="item-content">
									{!addNewColumn && (
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
												<X
													className="delete-btn"
													size={14}
													onClick={(): void => addColumn.onRemove(id as string)}
												/>
											</div>
										))}
									</div>

									{addColumn?.isFetching && (
										<div className="loading-container"> Loading ... </div>
									)}

									{addNewColumn &&
										addColumn &&
										addColumn.value.length > 0 &&
										addColumn.options &&
										addColumn?.options?.length > 0 && (
											<Divider className="column-divider" />
										)}

									{addNewColumn && (
										<div className="column-format-new-options">
											{addColumn?.options?.map(({ label, value }) => (
												<div
													className="column-name"
													key={value}
													onClick={(eve): void => {
														eve.stopPropagation();

														if (addColumn && addColumn?.onSelect) {
															addColumn?.onSelect(value, { label, disabled: false });
														}
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
									)}
								</div>
							</div>
						</>
					)}
				</>
			)}
		</div>
	);
}
