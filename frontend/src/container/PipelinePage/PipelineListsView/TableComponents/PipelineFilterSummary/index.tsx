import './styles.scss';

import { queryFilterTags } from 'hooks/queryBuilder/useTag';
import { PipelineData } from 'types/api/pipeline/def';

function PipelineFilterSummary({
	filter,
}: PipelineFilterSummaryProps): JSX.Element {
	return (
		<div className="pipeline-filter-preview-container">
			{queryFilterTags(filter).map((tag) => (
				<div className="pipeline-filter-preview-condition" key={tag}>
					{tag}
				</div>
			))}
		</div>
	);
}

interface PipelineFilterSummaryProps {
	filter: PipelineData['filter'];
}

export default PipelineFilterSummary;
