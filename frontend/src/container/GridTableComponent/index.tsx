import { initialQueriesMap } from 'constants/queryBuilder';
import { QueryTable } from 'container/QueryTable';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { memo } from 'react';

import { WrapperStyled } from './styles';
import { GridTableComponentProps } from './types';

function GridTableComponent({
	data,
	...props
}: GridTableComponentProps): JSX.Element {
	const { stagedQuery } = useQueryBuilder();

	return (
		<WrapperStyled>
			<QueryTable
				query={stagedQuery || initialQueriesMap.metrics}
				queryTableData={data}
				loading={false}
				// eslint-disable-next-line react/jsx-props-no-spreading
				{...props}
			/>
		</WrapperStyled>
	);
}

export default memo(GridTableComponent);
