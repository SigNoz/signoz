import { queryFilterTags } from 'hooks/queryBuilder/useTag';
import styled from 'styled-components';
import { PipelineData } from 'types/api/pipeline/def';

const FilterCondition = styled.div`
	display: inline;
	padding: 0 0.25em;
`;

const FilterContainer = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 0.2rem;
	font-size: 0.75rem;
`;

function PipelineFilterPreview({
	filter,
}: PipelineFilterPreviewProps): JSX.Element {
	return (
		<FilterContainer>
			{queryFilterTags(filter).map((tag) => (
				<FilterCondition key={tag}>{tag}</FilterCondition>
			))}
		</FilterContainer>
	);
}

interface PipelineFilterPreviewProps {
	filter: PipelineData['filter'];
}

export default PipelineFilterPreview;
