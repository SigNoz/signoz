import { Button, Row } from 'antd';
import React from 'react';

import { QueryFields } from './utils';

interface SearchFieldsActionBarProps {
	fieldsQuery: QueryFields[][];
	applyUpdate: () => void;
	clearFilters: () => void;
}

export function SearchFieldsActionBar({
	fieldsQuery,
	applyUpdate,
	clearFilters,
}: SearchFieldsActionBarProps): JSX.Element | null {
	if (fieldsQuery.length === 0) {
		return null;
	}

	return (
		<Row style={{ justifyContent: 'flex-end', paddingRight: '2.4rem' }}>
			<Button type="default" onClick={clearFilters} style={{ marginRight: '1em' }}>
				Clear Filter
			</Button>
			<Button type="primary" onClick={applyUpdate}>
				Apply
			</Button>
		</Row>
	);
}
export default SearchFieldsActionBar;
