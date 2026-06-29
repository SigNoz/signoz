import { fireEvent, render, screen } from '@testing-library/react';
import type { DashboardLinkDTO } from 'api/generated/services/sigNoz.schemas';

import ContextLinksSection from '../ContextLinksSection';

const LINKS: DashboardLinkDTO[] = [
	{ name: 'Docs', url: 'https://signoz.io', targetBlank: true },
];

describe('ContextLinksSection', () => {
	it('renders only the add button when there are no links', () => {
		render(<ContextLinksSection value={undefined} onChange={jest.fn()} />);

		expect(screen.getByTestId('panel-editor-v2-add-link')).toBeInTheDocument();
		expect(screen.queryByTestId('context-link-label-0')).not.toBeInTheDocument();
	});

	it('appends a blank link (open-in-new-tab on) when Add link is clicked', () => {
		const onChange = jest.fn();
		render(<ContextLinksSection value={[]} onChange={onChange} />);

		fireEvent.click(screen.getByTestId('panel-editor-v2-add-link'));

		expect(onChange).toHaveBeenCalledWith([
			{ name: '', url: '', targetBlank: true },
		]);
	});

	it('renders existing links and edits a label through onChange', () => {
		const onChange = jest.fn();
		render(<ContextLinksSection value={LINKS} onChange={onChange} />);

		expect(screen.getByTestId('context-link-label-0')).toHaveValue('Docs');
		expect(screen.getByTestId('context-link-url-0')).toHaveValue(
			'https://signoz.io',
		);

		fireEvent.change(screen.getByTestId('context-link-label-0'), {
			target: { value: 'Runbook' },
		});
		expect(onChange).toHaveBeenCalledWith([
			{ name: 'Runbook', url: 'https://signoz.io', targetBlank: true },
		]);
	});

	it('removes a link through onChange', () => {
		const onChange = jest.fn();
		render(<ContextLinksSection value={LINKS} onChange={onChange} />);

		fireEvent.click(screen.getByTestId('context-link-remove-0'));

		expect(onChange).toHaveBeenCalledWith([]);
	});
});
