import React from 'react';

import { PipelineIndexIcon } from '../AddNewProcessor/styles';

function PipelineSequence({
	value,
}: PipelineSequenceProps): React.ReactElement {
	return <PipelineIndexIcon>{value}</PipelineIndexIcon>;
}

interface PipelineSequenceProps {
	value: number;
}
export default PipelineSequence;
