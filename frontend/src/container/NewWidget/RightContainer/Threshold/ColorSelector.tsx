import { DownOutlined } from '@ant-design/icons';
import { Button, ColorPicker, Dropdown, Space } from 'antd';
import { Color } from 'antd/es/color-picker';
import { MenuProps } from 'antd/lib';
import { useState } from 'react';

import CustomColor from './CustomColor';

function ColorSelector(): JSX.Element {
	const [color, setColor] = useState<string>('Red');

	const handleColorChange = (_: Color, hex: string): void => {
		setColor(hex);
	};

	const items: MenuProps['items'] = [
		{
			key: '1',
			label: <CustomColor color="Red" />,
			onClick: (): void => setColor('Red'),
		},
		{
			key: '2',
			label: <CustomColor color="Orange" />,
			onClick: (): void => setColor('Orange'),
		},
		{
			key: '3',
			label: <CustomColor color="Green" />,
			onClick: (): void => setColor('Green'),
		},
		{
			key: '4',
			label: <CustomColor color="Blue" />,
			onClick: (): void => setColor('Blue'),
		},
		{
			key: '5',
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
			<Button onClick={(e): void => e.preventDefault()}>
				<Space>
					<CustomColor color={color} />
					<DownOutlined />
				</Space>
			</Button>
		</Dropdown>
	);
}

export default ColorSelector;
