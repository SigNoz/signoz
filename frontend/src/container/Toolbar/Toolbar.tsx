import './Toolbar.styles.scss';

import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';

interface ToolbarProps {
	showAutoRefresh: boolean;
	leftActions?: JSX.Element;
	rightActions?: JSX.Element;
}

export default function Toolbar({
	showAutoRefresh,
	leftActions,
	rightActions,
}: ToolbarProps): JSX.Element {
	return (
		<div className="toolbar">
			<div className="leftActions">{leftActions}</div>
			<div className="timeRange">
				<DateTimeSelectionV2 showAutoRefresh={showAutoRefresh} />
			</div>
			<div className="rightActions">{rightActions}</div>
		</div>
	);
}

Toolbar.defaultProps = {
	leftActions: <div />,
	rightActions: <div />,
};
