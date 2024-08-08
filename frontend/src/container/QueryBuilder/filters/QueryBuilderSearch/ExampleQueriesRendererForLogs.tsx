/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './QueryBuilderSearch.styles.scss';

import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

function ExampleQueriesRendererForLogs({
	label,
	value,
	handleAddTag,
}: ExampleQueriesRendererForLogsProps): JSX.Element {
	return (
		<span
			className="example-query"
			onClick={(): void => {
				handleAddTag(value);
			}}
		>
			{label}
		</span>
	);
}

interface ExampleQueriesRendererForLogsProps {
	label: string;
	value: TagFilter;
	handleAddTag: (value: TagFilter) => void;
}

export default ExampleQueriesRendererForLogs;
