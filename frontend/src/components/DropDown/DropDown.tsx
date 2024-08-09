import './DropDown.styles.scss';

import { EllipsisOutlined } from '@ant-design/icons';
import { Button, Dropdown, MenuProps } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useState } from 'react';

function DropDown({
	element,
	onDropDownItemClick,
}: {
	element: JSX.Element[];
	onDropDownItemClick?: MenuProps['onClick'];
}): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const items: MenuProps['items'] = element.map(
		(e: JSX.Element, index: number) => ({
			label: e,
			key: index,
		}),
	);

	const [isDdOpen, setDdOpen] = useState<boolean>(false);

	return (
		<Dropdown
			menu={{
				items,
				onMouseEnter: (): void => setDdOpen(true),
				onMouseLeave: (): void => setDdOpen(false),
				onClick: (item): void => onDropDownItemClick?.(item),
			}}
			open={isDdOpen}
		>
			<Button
				type="link"
				className={!isDarkMode ? 'dropdown-button--dark' : 'dropdown-button'}
				onClick={(e): void => {
					e.preventDefault();
					setDdOpen(true);
				}}
			>
				<EllipsisOutlined className="dropdown-icon" />
			</Button>
		</Dropdown>
	);
}

DropDown.defaultProps = {
	onDropDownItemClick: (): void => {},
};

export default DropDown;
