import './ColorSelector.styles.scss';

import { DownOutlined } from '@ant-design/icons';
import { Button, ColorPicker, Dropdown, Space } from 'antd';
import { Color } from 'antd/es/color-picker';
import { MenuProps } from 'antd/lib';
import useDebounce from 'hooks/useDebounce';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';

import CustomColor from './CustomColor';

function ColorSelector({
	thresholdColor = 'Red',
	setColor,
}: ColorSelectorProps): JSX.Element {
	const [colorFromPicker, setColorFromPicker] = useState<string>('');

	const debounceColor = useDebounce(colorFromPicker);

	useEffect(() => {
		if (debounceColor) {
			setColor(debounceColor);
		}
	}, [debounceColor, setColor]);

	const handleColorChange = (_: Color, hex: string): void => {
		setColorFromPicker(hex);
	};

	const items: MenuProps['items'] = [
		{
			key: 'Red',
			label: <CustomColor color="Red" />,
			onClick: (): void => setColor('Red'),
		},
		{
			key: 'Orange',
			label: <CustomColor color="Orange" />,
			onClick: (): void => setColor('Orange'),
		},
		{
			key: 'Green',
			label: <CustomColor color="Green" />,
			onClick: (): void => setColor('Green'),
		},
		{
			key: 'Blue',
			label: <CustomColor color="Blue" />,
			onClick: (): void => setColor('Blue'),
		},
		{
			key: 'Custom Color',
			label: (
				<ColorPicker
					trigger="hover"
					onChange={handleColorChange}
					placement="bottomLeft"
				>
					Custom Color
				</ColorPicker>
			),
		},
	];

	return (
		<Dropdown menu={{ items }} trigger={['click']}>
			<Button
				onClick={(e): void => e.preventDefault()}
				className="color-selector-button"
			>
				<Space className="color-selector-space">
					<CustomColor color={thresholdColor} />
					<DownOutlined />
				</Space>
			</Button>
		</Dropdown>
	);
}

interface ColorSelectorProps {
	thresholdColor?: string;
	setColor: Dispatch<SetStateAction<string>>;
}

ColorSelector.defaultProps = {
	thresholdColor: undefined,
};

export default ColorSelector;
