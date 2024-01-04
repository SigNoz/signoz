import './Toolbar.styles.scss';

import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';

interface ToolbarProps {
	leftActions?: JSX.Element;
	rightActions?: JSX.Element;
}

export default function Toolbar({
	leftActions,
	rightActions,
}: ToolbarProps): JSX.Element {
	console.log(leftActions, rightActions);
	return (
		<div className="toolbar">
			<div className="leftActions">{leftActions}</div>
			<div className="timeRange">
				<DateTimeSelectionV2 />
			</div>
			<div className="rightActions">{rightActions}</div>
		</div>
	);
}

Toolbar.defaultProps = {
	leftActions: <div />,
	rightActions: <div />,
};
