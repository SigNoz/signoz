import { SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';

function SearchFilters(): JSX.Element {
	return (
		<div className="search-filters">
			<div className="search-filters__input">
				<Input
					placeholder="Search Spans..."
					prefix={<SearchOutlined />}
					size="middle"
					className="search-filters__search-input"
				/>
			</div>
		</div>
	);
}

export default SearchFilters;
