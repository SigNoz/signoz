import { DownOutlined } from '@ant-design/icons';
import { Button, Col, Menu, Row, Select } from 'antd';
import { find } from 'lodash-es';
import React, { useCallback, useEffect, useState } from 'react';

import { Dropdown, Input, RetentionContainer, Typography } from './styles';
import {
	convertHoursValueToRelevantUnit,
	ITimeUnit,
	SettingPeriod,
	TimeUnits,
} from './utils';

const { Option } = Select;

function Retention({
	retentionValue,
	setRetentionValue,
	text,
	hide,
}: RetentionProps): JSX.Element {
	const {
		value: initialValue,
		timeUnitValue: initialTimeUnitValue,
	} = convertHoursValueToRelevantUnit(retentionValue);
	const [selectedTimeUnit, setSelectTimeUnit] = useState(initialTimeUnitValue);
	const [selectedValue, setSelectedValue] = useState<number | null>(null);

	useEffect(() => {
		setSelectedValue(initialValue);
	}, [initialValue]);


	useEffect(() => {
		setSelectTimeUnit(initialTimeUnitValue);
	}, [initialTimeUnitValue]);


	const menuItems = TimeUnits.map((option) => (
		<Option key={option.value} value={option.value}>
			{option.key}
		</Option>
	));

	const currentSelectedOption = (option: SettingPeriod): void => {
		const selectedValue = find(TimeUnits, (e) => e.value === option)?.value;
		if (selectedValue) setSelectTimeUnit(selectedValue);
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
				<Col flex={1} style={{ display: 'flex' }}>
					<Typography
						style={{
							verticalAlign: 'middle',
							whiteSpace: 'pre-wrap',
						}}
					>
						{text}
					</Typography>
				</Col>
				<Col flex="150px">
					<div style={{ display: 'inline-flex' }}>
						<Input
							value={selectedValue >= 0 ? selectedValue : ''}
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
					</div>
				</Col>
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
