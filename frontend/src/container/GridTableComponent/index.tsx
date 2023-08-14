import { QueryTable } from 'container/QueryTable';
import { memo } from 'react';

import { WrapperStyled } from './styles';
import { GridTableComponentProps } from './types';

function GridTableComponent({
	data,
	query,
	...props
}: GridTableComponentProps): JSX.Element {
	return (
		<WrapperStyled>
			<QueryTable
				query={query}
				queryTableData={data}
				loading={false}
				// eslint-disable-next-line react/jsx-props-no-spreading
				{...props}
			/>
		</WrapperStyled>
	);
}

export default memo(GridTableComponent);
