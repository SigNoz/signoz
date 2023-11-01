import './DropDown.styles.scss';

import { EllipsisOutlined } from '@ant-design/icons';
import { Button, Dropdown, MenuProps } from 'antd';
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
				className={!isDarkMode ? 'dropdown-button--dark' : 'dropdown-button'}
				onClick={(e): void => e.preventDefault()}
			>
				<EllipsisOutlined className="dropdown-icon" />
			</Button>
		</Dropdown>
	);
}

export default DropDown;
