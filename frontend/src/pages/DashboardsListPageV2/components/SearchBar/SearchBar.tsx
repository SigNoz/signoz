import { ChangeEvent } from 'react';
import { Input } from 'antd';
import { Color } from '@signozhq/design-tokens';
import { Search } from '@signozhq/icons';

interface Props {
	value: string;
	onChange: (value: string) => void;
}

function SearchBar({ value, onChange }: Props): JSX.Element {
	return (
		<Input
			placeholder="Search by name, description, or tags..."
			prefix={<Search size={12} color={Color.BG_VANILLA_400} />}
			value={value}
			data-testid="dashboards-list-search"
			onChange={(e: ChangeEvent<HTMLInputElement>): void =>
				onChange(e.target.value)
			}
		/>
	);
}

export default SearchBar;
