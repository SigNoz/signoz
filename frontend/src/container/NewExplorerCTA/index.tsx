import { CompassOutlined } from '@ant-design/icons';
import { Badge, Button } from 'antd';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom-v5-compat';

import { buttonText, RIBBON_STYLES } from './config';

function NewExplorerCTA(): JSX.Element | null {
	const location = useLocation();
	const { safeNavigate } = useSafeNavigate();

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
			safeNavigate(ROUTES.OLD_LOGS_EXPLORER);
		} else if (location.pathname === ROUTES.TRACE) {
			safeNavigate(ROUTES.TRACES_EXPLORER);
		} else if (location.pathname === ROUTES.OLD_LOGS_EXPLORER) {
			safeNavigate(ROUTES.LOGS_EXPLORER);
		} else if (location.pathname === ROUTES.TRACES_EXPLORER) {
			safeNavigate(ROUTES.TRACE);
		}
	}, [location.pathname, safeNavigate]);

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
