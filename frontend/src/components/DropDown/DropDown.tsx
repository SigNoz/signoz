import { Ellipsis } from '@signozhq/icons';
import { DropdownMenuSimple, type MenuItem } from '@signozhq/ui/dropdown-menu';
import { Button } from 'antd';

import './DropDown.styles.scss';

type DropDownItemClick = (info: { key: string; keyPath: string[] }) => void;

function DropDown({
	element,
	onDropDownItemClick,
}: {
	element: JSX.Element[];
	onDropDownItemClick?: DropDownItemClick;
}): JSX.Element {
	const items: MenuItem[] = element.map((e, index) => ({
		key: String(index),
		label: e,
		onClick: onDropDownItemClick,
	}));

	return (
		<DropdownMenuSimple menu={{ items }}>
			<Button type="link" className="dropdown-button">
				<Ellipsis className="dropdown-icon" size={16} />
			</Button>
		</DropdownMenuSimple>
	);
}

DropDown.defaultProps = {
	onDropDownItemClick: (): void => {},
};

export default DropDown;
