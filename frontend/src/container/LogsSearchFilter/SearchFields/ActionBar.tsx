import { Button, Row } from 'antd';

interface SearchFieldsActionBarProps {
	applyUpdate: VoidFunction;
	clearFilters: VoidFunction;
}

export function SearchFieldsActionBar({
	applyUpdate,
	clearFilters,
}: SearchFieldsActionBarProps): JSX.Element | null {
	return (
		<Row style={{ justifyContent: 'flex-end', paddingRight: '2.4rem' }}>
			<Button
				type="default"
				onClick={clearFilters}
				style={{ marginRight: '1rem' }}
			>
				Clear Filter
			</Button>
			<Button type="primary" onClick={applyUpdate}>
				Apply
			</Button>
		</Row>
	);
}
export default SearchFieldsActionBar;
