import { blue } from '@ant-design/colors';
import { SearchOutlined } from '@ant-design/icons';

function FilterIcon({ filtered }: FilterIconProps): JSX.Element {
	return (
		<SearchOutlined
			style={{
				color: filtered ? blue[6] : undefined,
			}}
		/>
	);
}

interface FilterIconProps {
	filtered: boolean;
}

export default FilterIcon;
