import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

function LogsFilterPreview({ filter }: LogsFilterPreviewProps): JSX.Element {
	return (
		<div>
			<pre>{JSON.stringify(filter, null, 2)}</pre>
		</div>
	);
}

interface LogsFilterPreviewProps {
	filter: TagFilter;
}

export default LogsFilterPreview;
