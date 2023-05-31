import { Value } from './styles';

function ValueGraph({ value }: ValueGraphProps): JSX.Element {
	return <Value>{value}</Value>;
}

interface ValueGraphProps {
	value: string;
}

export default ValueGraph;
