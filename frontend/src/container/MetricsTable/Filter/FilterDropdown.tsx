import { SearchOutlined } from '@ant-design/icons';
import { Button, Card, Input, Space } from 'antd';
import type { FilterDropdownProps } from 'antd/es/table/interface';

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
					placeholder="Search by service"
					value={selectedKeys[0]}
					onChange={selectedKeysHandler}
					allowClear
					onPressEnter={handleSearch}
				/>
				<Button
					type="primary"
					onClick={handleSearch}
					icon={<SearchOutlined />}
					size="small"
				>
					Search
				</Button>
			</Space>
		</Card>
	);
};
