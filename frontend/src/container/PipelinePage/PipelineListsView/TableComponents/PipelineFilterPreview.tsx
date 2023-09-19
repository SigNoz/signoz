import { Tag } from 'antd';
import { queryFilterTags } from 'hooks/queryBuilder/useTag';
import { PipelineData } from 'types/api/pipeline/def';

function PipelineFilterPreview({
	filter,
}: PipelineFilterPreviewProps): JSX.Element {
	// TODO(Raj): Add container styling, overflow wrapping
	// should maintain some space between rows.
	return (
		<div>
			{queryFilterTags(filter).map((tag) => (
				<Tag key={tag}>{tag}</Tag>
			))}
		</div>
	);
}

interface PipelineFilterPreviewProps {
	filter: PipelineData['filter'];
}

export default PipelineFilterPreview;
