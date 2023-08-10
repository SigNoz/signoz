import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { initialQueriesMap } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';

function BackButton(): JSX.Element {
	const history = useHistory();

	const handleBack = useCallback(() => {
		const compositeQuery = initialQueriesMap.logs;

		const JSONCompositeQuery = encodeURIComponent(JSON.stringify(compositeQuery));

		const path = `${ROUTES.LOGS_EXPLORER}?${JSONCompositeQuery}`;

		history.push(path);
	}, [history]);

	return (
		<Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
			Back
		</Button>
	);
}

export default BackButton;
