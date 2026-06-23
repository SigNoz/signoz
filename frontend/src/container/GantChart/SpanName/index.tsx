import { Container, Service, Span, SpanWrapper } from './styles';

function SpanNameComponent({
	name,
	serviceName,
}: SpanNameComponentProps): JSX.Element {
	return (
		<Container title={`${name} ${serviceName}`}>
			<SpanWrapper>
				<Span truncate={1}>{name}</Span>
				<Service truncate={1}>{serviceName}</Service>
			</SpanWrapper>
		</Container>
	);
}

interface SpanNameComponentProps {
	name: string;
	serviceName: string;
}

export default SpanNameComponent;
