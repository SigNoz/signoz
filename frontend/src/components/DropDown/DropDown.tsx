import './DropDown.styles.scss';

import { EllipsisOutlined } from '@ant-design/icons';
import { Button, Dropdown, MenuProps, Space } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';

function DropDown({ element }: { element: JSX.Element[] }): JSX.Element {
	const isDardMode = useIsDarkMode();

	const items: MenuProps['items'] = element.map(
		(e: JSX.Element, index: number) => ({
			label: e,
			key: index,
		}),
	);

	return (
		<Dropdown menu={{ items }} className="Dropdown-container">
			<Button
				type="link"
				className={!isDardMode ? 'Dropdown-button--dark' : 'Dropdown-button'}
				onClick={(e): void => e.preventDefault()}
			>
				<Space>
					<EllipsisOutlined className="Dropdown-icon" />
				</Space>
			</Button>
		</Dropdown>
	);
}

export default DropDown;
