import './styles.scss';

import { queryFilterTags } from 'hooks/queryBuilder/useTag';
import { PipelineData } from 'types/api/pipeline/def';

function PipelineFilterPreview({
	filter,
}: PipelineFilterPreviewProps): JSX.Element {
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

interface PipelineFilterPreviewProps {
	filter: PipelineData['filter'];
}

export default PipelineFilterPreview;
