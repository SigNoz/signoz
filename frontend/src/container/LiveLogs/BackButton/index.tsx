import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { QueryParams } from 'constants/query';
import {
	initialQueryBuilderFormValuesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { DataSource } from 'types/common/queryBuilder';

import { constructCompositeQuery } from '../constants';

function BackButton(): JSX.Element {
	const history = useHistory();

	const { updateAllQueriesOperators } = useQueryBuilder();

	const compositeQuery = useGetCompositeQueryParam();

	const handleBack = useCallback(() => {
		if (!compositeQuery) return;

		const nextCompositeQuery = constructCompositeQuery({
			query: compositeQuery,
			initialQueryData: initialQueryBuilderFormValuesMap.logs,
			customQueryData: { disabled: false },
		});

		const updatedQuery = updateAllQueriesOperators(
			nextCompositeQuery,
			PANEL_TYPES.LIST,
			DataSource.LOGS,
		);

		const JSONCompositeQuery = encodeURIComponent(JSON.stringify(updatedQuery));

		const path = `${ROUTES.LOGS_EXPLORER}?${QueryParams.compositeQuery}=${JSONCompositeQuery}`;

		history.push(path);
	}, [history, compositeQuery, updateAllQueriesOperators]);

	return (
		<Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
			Exit live view
		</Button>
	);
}

export default BackButton;
