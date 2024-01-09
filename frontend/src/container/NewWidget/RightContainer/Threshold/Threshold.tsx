/* eslint-disable sonarjs/cognitive-complexity */
import './Threshold.styles.scss';

import { CheckOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import {
	Card,
	Divider,
	Input,
	InputNumber,
	Select,
	Space,
	Typography,
} from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useRef, useState } from 'react';
import { useDrag, useDrop, XYCoord } from 'react-dnd';

import {
	operatorOptions,
	panelTypeVsDragAndDrop,
	showAsOptions,
	unitOptions,
} from '../constants';
import ColorSelector from './ColorSelector';
import CustomColor from './CustomColor';
import ShowCaseValue from './ShowCaseValue';
import { ThresholdProps } from './types';

const wrapStyle = {
	flexWrap: 'wrap',
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

	const backgroundColor = !isDarkMode ? '#ffffff' : '#141414';
	const allowDragAndDrop = panelTypeVsDragAndDrop[selectedGraph];

	return (
		<div
			ref={allowDragAndDrop ? ref : null}
			style={{ opacity }}
			data-handler-id={handlerId}
			className="threshold-container"
		>
			<Card
				className={
					isDarkMode
						? `threshold-card threshold-card-dark`
						: `threshold-card threshold-card-light`
				}
			>
				<div className="threshold-card-container">
					<div className="threshold-action-button">
						{isEditMode ? (
							<CheckOutlined onClick={saveHandler} />
						) : (
							<EditOutlined className="threshold-action-icon" onClick={editHandler} />
						)}
						<Divider type="vertical" />
						<DeleteOutlined
							className="threshold-action-icon"
							onClick={deleteHandler}
						/>
					</div>
					<div>
						<Space
							direction={
								selectedGraph === PANEL_TYPES.TABLE ? 'vertical' : 'horizontal'
							}
						>
							{selectedGraph === PANEL_TYPES.TIME_SERIES && (
								<Space style={wrapStyle}>
									<Typography.Text>Label</Typography.Text>
									{isEditMode ? (
										<Input
											defaultValue={label}
											onChange={handleLabelChange}
											bordered={!isDarkMode}
											style={{ backgroundColor }}
										/>
									) : (
										<ShowCaseValue width="180px" value={label || 'none'} />
									)}
								</Space>
							)}
							{(selectedGraph === PANEL_TYPES.VALUE ||
								selectedGraph === PANEL_TYPES.TABLE) && (
								<>
									<Typography.Text>
										If value {selectedGraph === PANEL_TYPES.TABLE ? 'in' : 'is'}
									</Typography.Text>
									{isEditMode ? (
										<>
											{selectedGraph === PANEL_TYPES.TABLE && (
												<Space style={wrapStyle}>
													<Select
														style={{
															minWidth: '150px',
															backgroundColor,
															borderRadius: '5px',
														}}
														defaultValue={tableSelectedOption}
														options={tableOptions}
														bordered={!isDarkMode}
														showSearch
														onChange={handleTableOptionsChange}
													/>
													<Typography.Text>is</Typography.Text>
												</Space>
											)}
											<Select
												style={{ minWidth: '73px', backgroundColor }}
												defaultValue={operator}
												options={operatorOptions}
												onChange={handleOperatorChange}
												bordered={!isDarkMode}
											/>
										</>
									) : (
										<>
											{selectedGraph === PANEL_TYPES.TABLE && (
												<Space style={wrapStyle}>
													<ShowCaseValue width="150px" value={tableSelectedOption} />
													<Typography.Text>is</Typography.Text>
												</Space>
											)}
											<ShowCaseValue width="49px" value={operator} />
										</>
									)}
								</>
							)}
						</Space>
					</div>
					<div className="threshold-units-selector">
						<Space style={wrapStyle}>
							{isEditMode ? (
								<InputNumber
									style={{ backgroundColor }}
									defaultValue={value}
									onChange={handleValueChange}
									bordered={!isDarkMode}
								/>
							) : (
								<ShowCaseValue width="60px" value={value} />
							)}
							{isEditMode ? (
								<Select
									style={{ minWidth: '200px', backgroundColor }}
									bordered={!isDarkMode}
									defaultValue={unit}
									options={unitOptions}
									onChange={handleUnitChange}
									showSearch
								/>
							) : (
								<ShowCaseValue width="200px" value={unit} />
							)}
						</Space>
					</div>
					<div>
						<Space direction="vertical">
							<Typography.Text>Show with</Typography.Text>
							<Space style={wrapStyle}>
								{isEditMode ? (
									<>
										<ColorSelector setColor={setColor} thresholdColor={color} />
										<Select
											style={{ minWidth: '100px', backgroundColor }}
											defaultValue={format}
											options={showAsOptions}
											onChange={handlerFormatChange}
											bordered={!isDarkMode}
										/>
									</>
								) : (
									<>
										<ShowCaseValue width="120px" value={<CustomColor color={color} />} />
										<ShowCaseValue width="100px" value={format} />
									</>
								)}
							</Space>
						</Space>
					</div>
				</div>
			</Card>
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
