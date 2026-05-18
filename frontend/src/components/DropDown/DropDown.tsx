import { useState } from 'react';
import { Ellipsis } from '@signozhq/icons';
import { Dropdown, MenuProps } from 'antd';

import './DropDown.styles.scss';
import { Button } from '@signozhq/ui/button';

function DropDown({
	element,
	onDropDownItemClick,
}: {
	element: JSX.Element[];
	onDropDownItemClick?: MenuProps['onClick'];
}): JSX.Element {
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
				className={`dropdown-button`}
				onClick={(e): void => {
					e.preventDefault();
					setDdOpen(true);
				}}
				variant="link"
			>
				<Ellipsis className="dropdown-icon" size={16} />
			</Button>
		</Dropdown>
	);
}

DropDown.defaultProps = {
	onDropDownItemClick: (): void => {},
};

export default DropDown;
