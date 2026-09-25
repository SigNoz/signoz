import { useAIAssistantStore } from 'container/AIAssistant/store/useAIAssistantStore';
import { render } from 'tests/test-utils';

import StripInfo from '../StripInfo';

function seed(conversations: Record<string, unknown>): void {
	useAIAssistantStore.setState({ conversations } as never);
}

describe('StripInfo', () => {
	it('counts only the conversations that are not archived', () => {
		seed({
			a: { id: 'a' },
			b: { id: 'b' },
			c: { id: 'c', archived: true },
		});

		const { getByText } = render(<StripInfo />);

		expect(getByText('2 conversations')).toBeInTheDocument();
	});

	it('says one conversation, not 1 conversations', () => {
		seed({ a: { id: 'a' } });

		const { getByText } = render(<StripInfo />);

		expect(getByText('1 conversation')).toBeInTheDocument();
	});

	it('shows zero when there are none', () => {
		seed({});

		const { getByText } = render(<StripInfo />);

		expect(getByText('0 conversations')).toBeInTheDocument();
	});
});
