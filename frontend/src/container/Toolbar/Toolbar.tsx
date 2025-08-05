import './Toolbar.styles.scss';

import ROUTES from 'constants/routes';
import NewExplorerCTA from 'container/NewExplorerCTA';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

interface ToolbarProps {
	showAutoRefresh: boolean;
	leftActions?: JSX.Element;
	rightActions?: JSX.Element;
	showOldCTA?: boolean;
	warningElement?: JSX.Element;
}

export default function Toolbar({
	showAutoRefresh,
	leftActions,
	rightActions,
	showOldCTA,
	warningElement,
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
					<DateTimeSelectionV2
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
};
