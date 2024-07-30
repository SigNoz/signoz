/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './QueryBuilderSearch.styles.scss';

function ExampleQueriesRendererForLogs({
	label,
	value,
}: ExampleQueriesRendererForLogsProps): JSX.Element {
	console.log(label, value);
	return (
		<span
			className="example-query"
			onClick={(e): void => {
				e.preventDefault();
				e.stopPropagation();
			}}
		>
			{label}
		</span>
	);
}

interface ExampleQueriesRendererForLogsProps {
	label: string;
	value: string;
}

export default ExampleQueriesRendererForLogs;
