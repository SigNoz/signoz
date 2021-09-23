import React from 'react';

import { Value } from './styles';

const ValueGraph = ({ value }: ValueGraphProps): JSX.Element => (
	<Value>{value}</Value>
);

interface ValueGraphProps {
	value: string;
}

export default ValueGraph;
