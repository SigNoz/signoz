/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import './QueryBuilderSearch.styles.scss';

function ExampleQueriesRendererForLogs({
	label,
	value,
	handleAddTag,
}: ExampleQueriesRendererForLogsProps): JSX.Element {
	return (
		<div
			className="example-query-container"
			onClick={(): void => {
				handleAddTag(value);
			}}
		>
			<span className="example-query">{label}</span>
		</div>
	);
}

interface ExampleQueriesRendererForLogsProps {
	label: string;
	value: TagFilter;
	handleAddTag: (value: TagFilter) => void;
}

export default ExampleQueriesRendererForLogs;
