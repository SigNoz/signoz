import './Toolbar.styles.scss';

import NewExplorerCTA from 'container/NewExplorerCTA';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';

interface ToolbarProps {
	showAutoRefresh: boolean;
	leftActions?: JSX.Element;
	rightActions?: JSX.Element;
	showOldCTA?: boolean;
}

export default function Toolbar({
	showAutoRefresh,
	leftActions,
	rightActions,
	showOldCTA,
}: ToolbarProps): JSX.Element {
	return (
		<div className="toolbar">
			<div className="leftActions">{leftActions}</div>
			<div className="timeRange">
				{showOldCTA && <NewExplorerCTA />}
				<DateTimeSelectionV2 showAutoRefresh={showAutoRefresh} />
			</div>
			<div className="rightActions">{rightActions}</div>
		</div>
	);
}

Toolbar.defaultProps = {
	leftActions: <div />,
	rightActions: <div />,
	showOldCTA: false,
};
