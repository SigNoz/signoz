import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { initialQueriesMap } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';

function BackButton(): JSX.Element {
	const history = useHistory();

	const { resetQuery } = useQueryBuilder();

	const handleBack = useCallback(() => {
		const compositeQuery = initialQueriesMap.logs;

		const JSONCompositeQuery = encodeURIComponent(JSON.stringify(compositeQuery));

		const path = `${ROUTES.LOGS_EXPLORER}?${JSONCompositeQuery}`;

		const { queryType, ...queryState } = initialQueriesMap.logs;

		resetQuery(queryState);

		history.push(path);
	}, [history, resetQuery]);

	return (
		<Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
			Exit live view
		</Button>
	);
}

export default BackButton;
