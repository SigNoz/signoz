import React from 'react';
import { Service, Span, SpanWrapper, Container } from './styles';

const SpanNameComponent = ({
	name,
	serviceName,
}: SpanNameComponent): JSX.Element => {
	return (
		<Container title={`${name} ${serviceName}`}>
			<SpanWrapper>
				<Span ellipsis>{name}</Span>
				<Service>{serviceName}</Service>
			</SpanWrapper>
		</Container>
	);
};

interface SpanNameComponent {
	name: string;
	serviceName: string;
}

export default SpanNameComponent;
