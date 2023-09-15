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
		() =>
			location.pathname === ROUTES.LOGS_EXPLORER ||
			location.pathname === ROUTES.TRACE,
		[location.pathname],
	);

	const onClickHandler = (): void => {
		if (location.pathname === ROUTES.LOGS_EXPLORER) {
			history.push(ROUTES.LOGS);
		} else if (location.pathname === ROUTES.TRACE) {
			history.push(ROUTES.TRACES_EXPLORER);
		}
	};

	const buttonText = {
		[ROUTES.LOGS_EXPLORER]: 'Try old Logs Explorer',
		[ROUTES.TRACE]: 'Try new Traces Explorer',
	};

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
				{buttonText[location.pathname]}
			</Button>
		</Badge.Ribbon>
	);
}

export default NewExplorerCTA;
