import './Integrations.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Input, Typography } from 'antd';
import { Search } from 'lucide-react';
import { useState } from 'react';

function Header(): JSX.Element {
	const [searchValue, setSearchValue] = useState<string>('');

	const handleSearch = (e: React.ChangeEvent<HTMLInputElement>): void => {
		setSearchValue(e.target.value);
	};
	return (
		<div className="integrations-header">
			<Typography.Title className="title">Integrations</Typography.Title>
			<Typography.Text className="subtitle">
				Manage Integrations for this workspace
			</Typography.Text>

			<Input
				placeholder="Search for an integration..."
				prefix={<Search size={12} color={Color.BG_VANILLA_400} />}
				value={searchValue}
				onChange={handleSearch}
				className="integrations-search-input"
			/>
		</div>
	);
}

export default Header;
