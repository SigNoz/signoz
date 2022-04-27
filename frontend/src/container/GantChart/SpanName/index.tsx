import React from 'react';

import { Container, Service, Span, SpanWrapper } from './styles';

function SpanNameComponent({
	name,
	serviceName,
}: SpanNameComponentProps): JSX.Element {
	return (
		<Container title={`${name} ${serviceName}`}>
			<SpanWrapper>
				<Span ellipsis>{name}</Span>
				<Service>{serviceName}</Service>
			</SpanWrapper>
		</Container>
	);
}

interface SpanNameComponentProps {
	name: string;
	serviceName: string;
}

export default SpanNameComponent;
