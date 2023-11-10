import './Threshold.styles.scss';

import { CheckOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Card, Divider, InputNumber, Select, Space, Typography } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useRef, useState } from 'react';
import { useDrag, useDrop, XYCoord } from 'react-dnd';

import { operatorOptions, showAsOptions, unitOptions } from '../constants';
import ColorSelector from './ColorSelector';
import CustomColor from './CustomColor';
import ShowCaseValue from './ShowCaseValue';
import { ThresholdProps } from './types';

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

	return (
		<div
			ref={ref}
			style={{ opacity }}
			data-handler-id={handlerId}
			className="threahold-container"
		>
			<Card
				className={
					isDarkMode
						? `threahold-card threahold-card-dark`
						: `threahold-card threahold-card-light`
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
						<Space>
							<Typography.Text>If value is</Typography.Text>
							{isEditMode ? (
								<Select
									style={{ minWidth: '73px' }}
									defaultValue={operator}
									options={operatorOptions}
									onChange={handleOperatorChange}
								/>
							) : (
								<ShowCaseValue width="49px" value={operator} />
							)}
						</Space>
					</div>
					<div className="threshold-units-selector">
						<Space>
							{isEditMode ? (
								<InputNumber defaultValue={value} onChange={handleValueChange} />
							) : (
								<ShowCaseValue width="60px" value={value} />
							)}
							{isEditMode ? (
								<Select
									style={{ minWidth: '200px' }}
									defaultValue={unit}
									options={unitOptions}
									onChange={handleUnitChange}
								/>
							) : (
								<ShowCaseValue width="200px" value={unit} />
							)}
						</Space>
					</div>
					<div>
						<Space direction="vertical">
							<Typography.Text>Show with</Typography.Text>
							<Space>
								{isEditMode ? (
									<ColorSelector setColor={setColor} thresholdColor={color} />
								) : (
									<ShowCaseValue width="100px" value={<CustomColor color={color} />} />
								)}
								{isEditMode ? (
									<Select
										style={{ minWidth: '100px' }}
										defaultValue={format}
										options={showAsOptions}
										onChange={handlerFormatChange}
									/>
								) : (
									<ShowCaseValue width="100px" value={format} />
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
	isEditEnabled: false,
	thresholdDeleteHandler: undefined,
};

export default Threshold;
