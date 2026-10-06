import { render, screen } from '@testing-library/react';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import SpanHintBadge from '../SpanHintBadge';

const spanWith = (
	attributes: Record<string, string | number>,
	responseStatusCode = '',
): SpanV3 =>
	({
		attributes,
		resource: {},
		response_status_code: responseStatusCode,
	}) as unknown as SpanV3;

describe('SpanHintBadge', () => {
	it.each([
		[{ 'gen_ai.request.model': 'gpt-4o' }, 'LLM'],
		[{ 'gen_ai.tool.name': 'search' }, 'TOOL'],
		[{ 'gen_ai.agent.name': 'planner' }, 'AGENT'],
	])('shows only the AI badge for %p', (attributes, label) => {
		render(<SpanHintBadge span={spanWith(attributes, '200')} />);

		expect(screen.getByText(label)).toBeInTheDocument();
		expect(screen.queryByText('200')).not.toBeInTheDocument();
	});

	it('falls back to the HTTP status code for non-AI spans', () => {
		render(<SpanHintBadge span={spanWith({}, '503')} />);

		expect(screen.getByText('503')).toBeInTheDocument();
	});

	it('renders nothing for a non-AI span without a status code', () => {
		const { container } = render(<SpanHintBadge span={spanWith({})} />);

		expect(container).toBeEmptyDOMElement();
	});
});
