import './Integrations.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Flex, Input, Typography } from 'antd';
import { Search } from 'lucide-react';
import { Dispatch, SetStateAction } from 'react';

interface HeaderProps {
	searchTerm: string;
	setSearchTerm: Dispatch<SetStateAction<string>>;
}

function Header(props: HeaderProps): JSX.Element {
	const { searchTerm, setSearchTerm } = props;

	const handleSearch = (e: React.ChangeEvent<HTMLInputElement>): void => {
		setSearchTerm(e.target.value);
	};
	return (
		<div className="integrations-header">
			<Typography.Title className="title">Integrations</Typography.Title>
			<Flex justify="space-between" align="center">
				<Typography.Text className="subtitle">
					Manage Integrations for this workspace
				</Typography.Text>
			</Flex>

			<Input
				placeholder="Search for an integration..."
				prefix={<Search size={12} color={Color.BG_VANILLA_400} />}
				value={searchTerm}
				onChange={handleSearch}
				className="integrations-search-input"
			/>
		</div>
	);
}

export default Header;
