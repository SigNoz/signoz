/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './NestedMenu.styles.scss';

import { Button, Input, InputNumber } from 'antd';
import cx from 'classnames';
import { OptionsMenuConfig } from 'container/OptionsMenu/types';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { Check, Cross, Minus, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface NestedMenuProps {
	title: string;
	items: any;
	selectedOptionFormat: any;
	config: OptionsMenuConfig;
}

export default function NestedMenu({
	title,
	items,
	selectedOptionFormat,
	config,
}: NestedMenuProps): JSX.Element {
	const { maxLines, format, addColumn } = config;
	const [selectedItem, setSelectedItem] = useState(selectedOptionFormat);

	const maxLinesNumber = (maxLines?.value as number) || 1;

	const [maxLinesPerRow, setMaxLinesPerRow] = useState<number>(maxLinesNumber);

	const [addNewColumn, setAddNewColumn] = useState(false);

	console.log({
		title,
		items,
		selectedOptionFormat,
	});

	const onChange = useCallback(
		(key) => {
			if (!format) return;

			format.onChange(key);
		},
		[format],
	);

	const handleMenuItemClick = (key): void => {
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

	const handleSearchValueChange = useDebouncedFn((event): void => {
		console.log('vaklue', event?.target?.value);

		const value = event?.target?.value || '';

		if (addColumn) {
			addColumn?.onSearch(value);
		}
	}, 300);

	const handleAddNewColumn = (): void => {
		setAddNewColumn(!addNewColumn);
	};

	console.log('optionsMenuConfig', config);

	const handleLinesPerRowChange = (maxLinesPerRow: number): void => {
		setMaxLinesPerRow(maxLinesPerRow);
	};

	useEffect(() => {
		if (maxLinesPerRow && config && config.maxLines?.onChange) {
			config.maxLines.onChange(maxLinesPerRow);
		}
	}, [maxLinesPerRow]);

	return (
		<div
			className={cx(
				'nested-menu-container',
				addNewColumn && selectedItem !== 'raw' ? 'active' : '',
			)}
		>
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
				<div className="selected-item-content-container active">
					{!addNewColumn && <div className="horizontal-line" />}

					{addNewColumn && selectedItem !== 'raw' && (
						<Input
							tabIndex={0}
							type="text"
							onFocus={addColumn?.onFocus}
							onChange={handleSearchValueChange}
							placeholder="Search..."
						/>
					)}

					<div className="item-content">
						{selectedItem === 'raw' && (
							<>
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
							</>
						)}

						{(selectedItem === 'table' || selectedItem === 'list') && (
							<>
								{!addNewColumn && (
									<div className="title">
										{' '}
										columns <Plus size={14} onClick={handleAddNewColumn} />{' '}
									</div>
								)}

								<div className="column-format">
									{addColumn?.value?.map(({ key, id }) => (
										<div className="column-name" key={id}>
											{key}

											{/* <X size={14} onClick={handleAddNewColumn} /> */}
										</div>
									))}
								</div>

								{addColumn?.isFetching && (
									<div className="loading-container"> Loading ... </div>
								)}

								{!addColumn?.isFetching && addColumn && (
									<div className="column-format-new-options">
										{addColumn?.options?.map(({ label, value }) => (
											<div className="column-name" key={value}>
												{label}

												{/* <X size={14} onClick={handleAddNewColumn} /> */}
											</div>
										))}
									</div>
								)}
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
