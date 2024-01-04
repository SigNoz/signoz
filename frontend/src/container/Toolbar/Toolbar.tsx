import './Toolbar.styles.scss';

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
				<div>Refreshed 10 minutes ago</div>
				<div>Date time picker</div>
			</div>
			<div className="rightActions">{rightActions}</div>
		</div>
	);
}

Toolbar.defaultProps = {
	leftActions: <div />,
	rightActions: <div />,
};
