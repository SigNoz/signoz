import { Col, Row, Select } from 'antd';
import { find } from 'lodash-es';
import React, { useEffect, useRef, useState } from 'react';

import {
	Input,
	RetentionContainer,
	RetentionFieldInputContainer,
	RetentionFieldLabel,
} from './styles';
import {
	convertHoursValueToRelevantUnit,
	SettingPeriod,
	TimeUnits,
} from './utils';

const { Option } = Select;

function Retention({
	retentionValue,
	setRetentionValue,
	text,
	hide,
}: RetentionProps): JSX.Element | null {
	const {
		value: initialValue,
		timeUnitValue: initialTimeUnitValue,
	} = convertHoursValueToRelevantUnit(Number(retentionValue));
	const [selectedTimeUnit, setSelectTimeUnit] = useState(initialTimeUnitValue);
	const [selectedValue, setSelectedValue] = useState<number | null>(
		initialValue,
	);
	const interacted = useRef(false);
	useEffect(() => {
		if (!interacted.current) setSelectedValue(initialValue);
	}, [initialValue]);

	useEffect(() => {
		if (!interacted.current) setSelectTimeUnit(initialTimeUnitValue);
	}, [initialTimeUnitValue]);

	const menuItems = TimeUnits.map((option) => (
		<Option key={option.value} value={option.value}>
			{option.key}
		</Option>
	));

	const currentSelectedOption = (option: SettingPeriod): void => {
		const currentSelectedValue = find(TimeUnits, (e) => e.value === option)
			?.value;
		if (currentSelectedValue) setSelectTimeUnit(currentSelectedValue);
	};

	useEffect(() => {
		const inverseMultiplier = find(
			TimeUnits,
			(timeUnit) => timeUnit.value === selectedTimeUnit,
		)?.multiplier;
		if (!selectedValue) setRetentionValue(null);
		if (selectedValue && inverseMultiplier) {
			setRetentionValue(selectedValue * (1 / inverseMultiplier));
		}
	}, [selectedTimeUnit, selectedValue, setRetentionValue]);

	const onChangeHandler = (
		e: React.ChangeEvent<HTMLInputElement>,
		func: React.Dispatch<React.SetStateAction<number | null>>,
	): void => {
		interacted.current = true;
		const { value } = e.target;
		const integerValue = parseInt(value, 10);

		if (value.length > 0 && integerValue.toString() === value) {
			const parsedValue = Math.abs(integerValue);
			func(parsedValue);
		}

		if (value.length === 0) {
			func(null);
		}
	};
	if (hide) {
		return null;
	}
	return (
		<RetentionContainer>
			<Row justify="space-between">
				<Col span={12} style={{ display: 'flex' }}>
					<RetentionFieldLabel>{text}</RetentionFieldLabel>
				</Col>
				<Row justify="end">
					<RetentionFieldInputContainer>
						<Input
							value={selectedValue && selectedValue >= 0 ? selectedValue : ''}
							onChange={(e): void => onChangeHandler(e, setSelectedValue)}
							style={{ width: 75 }}
						/>
						<Select
							value={selectedTimeUnit}
							onChange={currentSelectedOption}
							style={{ width: 100 }}
						>
							{menuItems}
						</Select>
					</RetentionFieldInputContainer>
				</Row>
			</Row>
		</RetentionContainer>
	);
}

interface RetentionProps {
	retentionValue: number | null;
	text: string;
	setRetentionValue: React.Dispatch<React.SetStateAction<number | null>>;
	hide: boolean;
}

export default Retention;
