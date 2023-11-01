import './DropDown.styles.scss';

import { EllipsisOutlined } from '@ant-design/icons';
import { Button, Dropdown, MenuProps, Space } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';

function DropDown({ element }: { element: JSX.Element[] }): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const items: MenuProps['items'] = element.map(
		(e: JSX.Element, index: number) => ({
			label: e,
			key: index,
		}),
	);

	return (
		<Dropdown menu={{ items }}>
			<Button
				type="link"
				className={!isDarkMode ? 'Dropdown-button--dark' : 'Dropdown-button'}
				onClick={(e): void => e.preventDefault()}
			>
				<EllipsisOutlined className="Dropdown-icon" />
			</Button>
		</Dropdown>
	);
}

export default DropDown;
