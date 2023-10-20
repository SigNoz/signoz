import { EllipsisOutlined } from '@ant-design/icons';
import { Button, Dropdown, MenuProps, Space } from 'antd';

function DropDown({ element }: { element: JSX.Element[] }): JSX.Element {
	const items: MenuProps['items'] = element.map(
		(e: JSX.Element, index: number) => ({
			label: e,
			key: index,
		}),
	);

	return (
		<Dropdown menu={{ items }}>
			<Button type="link" onClick={(e): void => e.preventDefault()}>
				<Space>
					<EllipsisOutlined />
				</Space>
			</Button>
		</Dropdown>
	);
}

export default DropDown;
