import { Card, Input, Space } from 'antd';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import { Search } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';

import { SEARCH_PLACEHOLDER } from '../Columns/ColumnContants';

export const filterDropdown = ({
	setSelectedKeys,
	selectedKeys,
	confirm,
}: FilterDropdownProps): JSX.Element => {
	const handleSearch = (): void => {
		confirm();
	};

	const selectedKeysHandler = (e: React.ChangeEvent<HTMLInputElement>): void => {
		setSelectedKeys(e.target.value ? [e.target.value] : []);
	};

	return (
		<Card size="small">
			<Space align="start" direction="vertical">
				<Input
					placeholder={SEARCH_PLACEHOLDER}
					value={selectedKeys[0]}
					onChange={selectedKeysHandler}
					allowClear
					onPressEnter={handleSearch}
				/>
				<Button onClick={handleSearch} prefix={<Search size="md" />}>
					Search
				</Button>
			</Space>
		</Card>
	);
};
