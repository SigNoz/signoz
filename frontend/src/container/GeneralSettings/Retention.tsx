import { DownOutlined } from '@ant-design/icons';
import { Button, Menu } from 'antd';
import React from 'react';

import { SettingPeroid } from '.';
import {
	Dropdown,
	Input,
	RetentionContainer,
	TextContainer,
	Typography,
} from './styles';

function Retention({
	retentionValue,
	setRentionValue,
	selectedRetentionPeroid,
	setSelectedRetentionPeroid,
	text,
}: RetentionProps): JSX.Element {
	const options: Option[] = [
		{
			key: 'hr',
			value: 'Hrs',
		},
		{
			key: 'day',
			value: 'Days',
		},
		{
			key: 'month',
			value: 'Months',
		},
	];

	const onClickHandler = (
		e: { key: string },
		func: React.Dispatch<React.SetStateAction<SettingPeroid>>,
	): void => {
		const selected = e.key as SettingPeroid;
		func(selected);
	};

	const menu = (
		<Menu onClick={(e): void => onClickHandler(e, setSelectedRetentionPeroid)}>
			{options.map((option) => (
				<Menu.Item key={option.key}>{option.value}</Menu.Item>
			))}
		</Menu>
	);

	const currentSelectedOption = (option: SettingPeroid): string | undefined => {
		return options.find((e) => e.key === option)?.value;
	};

	const onChangeHandler = (
		e: React.ChangeEvent<HTMLInputElement>,
		func: React.Dispatch<React.SetStateAction<string>>,
	): void => {
		const { value } = e.target;
		const integerValue = parseInt(value, 10);

		if (value.length > 0 && integerValue.toString() === value) {
			const parsedValue = Math.abs(integerValue).toString();
			func(parsedValue);
		}

		if (value.length === 0) {
			func('');
		}
	};

	return (
		<RetentionContainer>
			<TextContainer>
				<Typography>{text}</Typography>
			</TextContainer>

			<Input
				value={retentionValue}
				onChange={(e): void => onChangeHandler(e, setRentionValue)}
			/>

			<Dropdown overlay={menu}>
				<Button>
					{currentSelectedOption(selectedRetentionPeroid)} <DownOutlined />
				</Button>
			</Dropdown>
		</RetentionContainer>
	);
}

interface Option {
	key: SettingPeroid;
	value: string;
}

interface RetentionProps {
	retentionValue: string;
	text: string;
	setRentionValue: React.Dispatch<React.SetStateAction<string>>;
	selectedRetentionPeroid: SettingPeroid;
	setSelectedRetentionPeroid: React.Dispatch<
		React.SetStateAction<SettingPeroid>
	>;
}

export default Retention;
