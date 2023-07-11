import { CompassOutlined } from '@ant-design/icons';
import { Badge, Button } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { RIBBON_STYLES } from './config';

function NewExplorerCTA(): JSX.Element | null {
	const location = useLocation();

	const isTraceOrLogsExplorerPage = useMemo(
		() => location.pathname === ROUTES.LOGS || location.pathname === ROUTES.TRACE,
		[location.pathname],
	);

	const onClickHandler = (): void => {
		if (location.pathname === ROUTES.LOGS) {
			history.push(ROUTES.LOGS_EXPLORER);
		} else if (location.pathname === ROUTES.TRACE) {
			history.push(ROUTES.TRACES_EXPLORER);
		}
	};

	const buttonText = useMemo(
		() =>
			`Try new ${ROUTES.LOGS === location.pathname ? 'Logs' : 'Traces'} Explorer`,
		[location.pathname],
	);

	if (!isTraceOrLogsExplorerPage) {
		return null;
	}

	return (
		<Badge.Ribbon style={RIBBON_STYLES} text="New">
			<Button
				icon={<CompassOutlined />}
				onClick={onClickHandler}
				danger
				type="primary"
			>
				{buttonText}
			</Button>
		</Badge.Ribbon>
	);
}

export default NewExplorerCTA;
