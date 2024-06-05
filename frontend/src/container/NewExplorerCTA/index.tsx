import { CompassOutlined } from '@ant-design/icons';
import { Badge, Button } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { buttonText, RIBBON_STYLES } from './config';

function NewExplorerCTA(): JSX.Element | null {
	const location = useLocation();

	const isTraceOrLogsExplorerPage = useMemo(
		() =>
			location.pathname === ROUTES.LOGS_EXPLORER ||
			location.pathname === ROUTES.TRACE ||
			location.pathname === ROUTES.OLD_LOGS_EXPLORER ||
			location.pathname === ROUTES.TRACES_EXPLORER,
		[location.pathname],
	);

	const onClickHandler = useCallback((): void => {
		if (location.pathname === ROUTES.LOGS_EXPLORER) {
			history.push(ROUTES.OLD_LOGS_EXPLORER);
		} else if (location.pathname === ROUTES.TRACE) {
			history.push(ROUTES.TRACES_EXPLORER);
		} else if (location.pathname === ROUTES.OLD_LOGS_EXPLORER) {
			history.push(ROUTES.LOGS_EXPLORER);
		} else if (location.pathname === ROUTES.TRACES_EXPLORER) {
			history.push(ROUTES.TRACE);
		}
	}, [location.pathname]);

	const button = useMemo(
		() => (
			<Button
				icon={<CompassOutlined />}
				onClick={onClickHandler}
				danger
				data-testid="newExplorerCTA"
				type="primary"
			>
				{buttonText[location.pathname]}
			</Button>
		),
		[location.pathname, onClickHandler],
	);

	if (!isTraceOrLogsExplorerPage) {
		return null;
	}

	if (location.pathname === ROUTES.TRACES_EXPLORER) {
		return button;
	}

	if (location.pathname === ROUTES.LOGS_EXPLORER) {
		return button;
	}

	return (
		<Badge.Ribbon style={RIBBON_STYLES} text="New">
			{button}
		</Badge.Ribbon>
	);
}

export default NewExplorerCTA;
