/* eslint-disable sonarjs/cognitive-complexity */
import './Threshold.styles.scss';

import { Button, Input, InputNumber, Select, Space, Typography } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { unitOptions } from 'container/NewWidget/utils';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useDrag, useDrop, XYCoord } from 'react-dnd';

import {
	operatorOptions,
	panelTypeVsDragAndDrop,
	showAsOptions,
} from '../constants';
import { convertUnit } from '../dataFormatCategories';
import ColorSelector from './ColorSelector';
import CustomColor from './CustomColor';
import ShowCaseValue from './ShowCaseValue';
import { ThresholdProps } from './types';

const wrapStyle = {
	flexWrap: 'wrap',
	gap: '10px',
} as React.CSSProperties;

function Threshold({
	index,
	thresholdOperator = '>',
	thresholdValue = 0,
	isEditEnabled = false,
	thresholdUnit = 'ms',
	thresholdColor = 'Red',
	thresholdFormat = 'Text',
	thresholdDeleteHandler,
	setThresholds,
	keyIndex,
	moveThreshold,
	selectedGraph,
	thresholdLabel = '',
	tableOptions,
	thresholdTableOptions = '',
	columnUnits,
}: ThresholdProps): JSX.Element {
	const [isEditMode, setIsEditMode] = useState<boolean>(isEditEnabled);
	const [operator, setOperator] = useState<string | number>(
		thresholdOperator as string | number,
	);
	const [value, setValue] = useState<number>(thresholdValue);
	const [unit, setUnit] = useState<string>(thresholdUnit);
	const [color, setColor] = useState<string>(thresholdColor);
	const [format, setFormat] = useState<ThresholdProps['thresholdFormat']>(
		thresholdFormat,
	);
	const [label, setLabel] = useState<string>(thresholdLabel);
	const [tableSelectedOption, setTableSelectedOption] = useState<string>(
		thresholdTableOptions,
	);

	const isDarkMode = useIsDarkMode();

	const saveHandler = (): void => {
		setIsEditMode(false);
		if (setThresholds === undefined) {
			return;
		}
		setThresholds((prevThresholds) =>
			prevThresholds.map((threshold) => {
				if (threshold.index === index) {
					return {
						...threshold,
						isEditEnabled: false,
						thresholdColor: color,
						thresholdFormat: format,
						thresholdOperator: operator as ThresholdProps['thresholdOperator'],
						thresholdUnit: unit,
						thresholdValue: value,
						thresholdLabel: label,
						thresholdTableOptions: tableSelectedOption,
					};
				}
				return threshold;
			}),
		);
	};

	const discardHandler = (): void => {
		setIsEditMode(false);
		setOperator(thresholdOperator);
		setValue(thresholdValue);
		setUnit(thresholdUnit);
		setColor(thresholdColor);
		setFormat(thresholdFormat);
		setLabel(thresholdLabel);
		setTableSelectedOption(thresholdTableOptions);
	};
	const editHandler = (): void => {
		setIsEditMode(true);
	};

	const handleOperatorChange = (value: string | number): void => {
		setOperator(value);
	};

	const handleValueChange = (value: number | null): void => {
		if (value === null) {
			return;
		}
		setValue(value);
	};

	const handleUnitChange = (value: string): void => {
		setUnit(value);
	};

	const handlerFormatChange = (
		value: ThresholdProps['thresholdFormat'],
	): void => {
		setFormat(value);
	};

	const handleTableOptionsChange = (value: string): void => {
		setTableSelectedOption(value);
	};

	const deleteHandler = (): void => {
		if (thresholdDeleteHandler) {
			thresholdDeleteHandler(index);
		}
	};

	const ref = useRef<HTMLDivElement>(null);
	const [{ handlerId }, drop] = useDrop<
		ThresholdProps,
		void,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		{ handlerId: any }
	>({
		accept: 'Threshold',
		collect(monitor) {
			return {
				handlerId: monitor.getHandlerId(),
			};
		},
		hover(item: ThresholdProps, monitor) {
			if (!ref.current) {
				return;
			}
			const dragIndex = item.keyIndex;
			const hoverIndex = keyIndex;

			if (dragIndex === hoverIndex) {
				return;
			}

			const hoverBoundingRect = ref.current?.getBoundingClientRect();

			const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

			const clientOffset = monitor.getClientOffset();

			const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

			if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
				return;
			}

			if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
				return;
			}

			moveThreshold(dragIndex, hoverIndex);
			// eslint-disable-next-line no-param-reassign
			item.keyIndex = hoverIndex;
		},
	});

	const [{ isDragging }, drag] = useDrag({
		type: 'Threshold',
		item: () => ({ keyIndex }),
		collect: (monitor) => ({
			isDragging: monitor.isDragging(),
		}),
	});

	const opacity = isDragging ? 0 : 1;
	drag(drop(ref));
	const handleLabelChange = (
		event: React.ChangeEvent<HTMLInputElement>,
	): void => {
		setLabel(event.target.value);
	};

	const allowDragAndDrop = panelTypeVsDragAndDrop[selectedGraph];

	const isInvalidUnitComparison = useMemo(
		() =>
			unit !== 'none' &&
			convertUnit(value, unit, columnUnits?.[tableSelectedOption]) === null,
		[unit, value, columnUnits, tableSelectedOption],
	);

	return (
		<div
			ref={allowDragAndDrop ? ref : null}
			style={{ opacity }}
			data-handler-id={handlerId}
			className="threshold-container"
		>
			<div className="threshold-card-container">
				{!isEditMode && (
					<div className="edit-action-btns">
						<Button
							type="text"
							icon={<Pencil size={14} />}
							className="edit-btn"
							onClick={editHandler}
						/>
						<Button
							type="text"
							icon={<Trash2 size={14} />}
							className="delete-btn"
							onClick={deleteHandler}
						/>
					</div>
				)}
				<div style={{ width: '100%' }}>
					{selectedGraph === PANEL_TYPES.TIME_SERIES && (
						<div className="time-series-alerts">
							<Typography.Text className="label">Label</Typography.Text>
							{isEditMode ? (
								<Input
									defaultValue={label}
									onChange={handleLabelChange}
									bordered={!isDarkMode}
									className="label-input"
								/>
							) : (
								<ShowCaseValue value={label || 'none'} className="label-input" />
							)}
						</div>
					)}
					{(selectedGraph === PANEL_TYPES.VALUE ||
						selectedGraph === PANEL_TYPES.TABLE) && (
						<div className="value-table-alerts">
							<Typography.Text className="typography">
								If value {selectedGraph === PANEL_TYPES.TABLE ? 'in' : 'is'}
							</Typography.Text>
							{isEditMode ? (
								<div>
									{selectedGraph === PANEL_TYPES.TABLE && (
										<Space style={wrapStyle}>
											<Select
												defaultValue={tableSelectedOption}
												options={tableOptions}
												bordered={!isDarkMode}
												showSearch
												onChange={handleTableOptionsChange}
												rootClassName="operator-input-root"
												className="operator-input"
											/>
											<Typography.Text className="typography">is</Typography.Text>
										</Space>
									)}
									<Select
										defaultValue={operator}
										options={operatorOptions}
										onChange={handleOperatorChange}
										bordered={!isDarkMode}
										style={{ marginLeft: '10px' }}
										rootClassName="operator-input-root"
										className="operator-input"
									/>
								</div>
							) : (
								<div>
									{selectedGraph === PANEL_TYPES.TABLE && (
										<Space>
											<ShowCaseValue
												value={tableSelectedOption}
												className="typography-preview"
											/>
											<Typography.Text
												className="typography"
												style={{ marginRight: '10px' }}
											>
												is
											</Typography.Text>
										</Space>
									)}
									<ShowCaseValue
										width="50px"
										value={operator}
										className="typography-preview"
									/>
								</div>
							)}
						</div>
					)}
				</div>
				<div className="threshold-units-selector">
					{isEditMode ? (
						<InputNumber
							defaultValue={value}
							onChange={handleValueChange}
							className="unit-input"
						/>
					) : (
						<ShowCaseValue value={value} className="unit-input" />
					)}
					{isEditMode ? (
						<Select
							defaultValue={unit}
							options={unitOptions(columnUnits?.[tableSelectedOption] || '')}
							onChange={handleUnitChange}
							showSearch
							className="unit-selection"
						/>
					) : (
						<ShowCaseValue value={unit} className="unit-selection-prev" />
					)}
				</div>
				<div className="thresholds-color-selector">
					{isEditMode ? (
						<>
							<div className="color-selector">
								<ColorSelector setColor={setColor} thresholdColor={color} />
							</div>
							<Select
								defaultValue={format}
								options={showAsOptions}
								onChange={handlerFormatChange}
								rootClassName="color-format"
							/>
						</>
					) : (
						<>
							<ShowCaseValue
								value={<CustomColor color={color} />}
								className="color-selector"
							/>
							<ShowCaseValue
								width="100px"
								value={format}
								className="color-format-prev"
							/>
						</>
					)}
				</div>
				{isInvalidUnitComparison && (
					<Typography.Text className="invalid-unit">
						Threshold unit ({unit}) is not valid in comparison with the column unit (
						{columnUnits?.[tableSelectedOption] || 'none'})
					</Typography.Text>
				)}
				{isEditMode && (
					<div className="threshold-action-button">
						<Button
							className="discard-btn"
							icon={<X size={14} />}
							onClick={discardHandler}
						>
							Discard
						</Button>
						<Button
							className="save-changes"
							icon={<Check size={14} />}
							onClick={saveHandler}
						>
							Save Changes
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}

Threshold.defaultProps = {
	thresholdOperator: undefined,
	thresholdValue: undefined,
	thresholdUnit: undefined,
	thresholdColor: undefined,
	thresholdFormat: undefined,
	thresholdLabel: undefined,
	isEditEnabled: false,
	thresholdDeleteHandler: undefined,
};

export default Threshold;
