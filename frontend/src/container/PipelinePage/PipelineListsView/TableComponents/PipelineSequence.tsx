import React from 'react';

import { PipelineIndexIcon } from '../AddNewProcessor/styles';

function PipelineSequence({ value }: PipelineSequenceProps): JSX.Element {
	return <PipelineIndexIcon>{value}</PipelineIndexIcon>;
}

interface PipelineSequenceProps {
	value: number;
}
export default PipelineSequence;
