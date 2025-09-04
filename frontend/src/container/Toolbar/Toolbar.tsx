import './Toolbar.styles.scss';

import ROUTES from 'constants/routes';
import LiveLogsPauseResume from 'container/LiveLogs/LiveLogsPauseResume/LiveLogsPauseResume';
import NewExplorerCTA from 'container/NewExplorerCTA';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { noop } from 'lodash-es';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

interface ToolbarProps {
	showAutoRefresh: boolean;
	leftActions?: JSX.Element;
	rightActions?: JSX.Element;
	showOldCTA?: boolean;
	warningElement?: JSX.Element;
	onGoLive?: () => void;
	onExitLiveLogs?: () => void;
	showLiveLogs?: boolean;
}

export default function Toolbar({
	showAutoRefresh,
	leftActions,
	rightActions,
	showOldCTA,
	warningElement,
	showLiveLogs,
	onGoLive,
	onExitLiveLogs,
}: ToolbarProps): JSX.Element {
	const { pathname } = useLocation();

	const isLogsExplorerPage = useMemo(() => pathname === ROUTES.LOGS_EXPLORER, [
		pathname,
	]);

	const isApiMonitoringPage = useMemo(() => pathname === ROUTES.API_MONITORING, [
		pathname,
	]);

	return (
		<div className="toolbar">
			<div className="leftActions">{leftActions}</div>

			<div className="rightActions">
				<div className="timeRange">
					{warningElement}
					{showOldCTA && <NewExplorerCTA />}
					{showLiveLogs && <LiveLogsPauseResume />}
					<DateTimeSelectionV2
						showLiveLogs={showLiveLogs}
						onExitLiveLogs={onExitLiveLogs}
						onGoLive={onGoLive}
						showAutoRefresh={showAutoRefresh}
						showRefreshText={!isLogsExplorerPage && !isApiMonitoringPage}
						hideShareModal
					/>
				</div>

				{rightActions}
			</div>
		</div>
	);
}

Toolbar.defaultProps = {
	leftActions: <div />,
	rightActions: <div />,
	showOldCTA: false,
	warningElement: <div />,
	showLiveLogs: false,
	onGoLive: (): void => noop(),
	onExitLiveLogs: (): void => {},
};
