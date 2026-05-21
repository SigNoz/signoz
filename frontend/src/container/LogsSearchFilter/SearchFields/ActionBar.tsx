import { Row } from 'antd';
import { Button } from '@signozhq/ui/button';

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
				onClick={clearFilters}
				style={{ marginRight: '1rem' }}
				variant="outlined"
				color="secondary"
			>
				Clear Filter
			</Button>
			<Button onClick={applyUpdate}>Apply</Button>
		</Row>
	);
}
export default SearchFieldsActionBar;
