import { DownOutlined } from '@ant-design/icons';
import { Button, Menu } from 'antd';
import { MenuInfo } from 'rc-menu/lib/interface';
import React from 'react';

import { SettingPeroid } from '.';
import {
	Dropdown,
	Input,
	RetentionContainer,
	TextContainer,
	Typography,
} from './styles';

const Retention = ({
	retentionValue,
	setRentionValue,
	selectedRetentionPeroid,
	setSelectedRetentionPeroid,
	text,
}: RetentionProps): JSX.Element => {
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
		e: MenuInfo,
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
		func: React.Dispatch<React.SetStateAction<number>>,
	): void => {
		const value = e.target.value;

		if (value.length > 0) {
			const parsedValue = Math.abs(parseInt(value, 10));
			func(parsedValue);
		}

		if (value.length === 0) {
			func(0);
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
};

interface Option {
	key: SettingPeroid;
	value: string;
}

interface RetentionProps {
	retentionValue: number;
	text: string;
	setRentionValue: React.Dispatch<React.SetStateAction<number>>;
	selectedRetentionPeroid: SettingPeroid;
	setSelectedRetentionPeroid: React.Dispatch<
		React.SetStateAction<SettingPeroid>
	>;
}

export default Retention;
