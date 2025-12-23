import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';

import type { CmdAction } from '../ShiftOverlay';
import { ShiftOverlay } from '../ShiftOverlay';

jest.mock('../formatShortcut', () => ({
	formatShortcut: (shortcut: string[]): string => shortcut.join('+'),
}));

const baseActions: CmdAction[] = [
	{
		id: '1',
		name: 'Go to Traces',
		section: 'navigation',
		shortcut: ['Shift', 'T'],
		perform: jest.fn(),
	},
	{
		id: '2',
		name: 'Go to Metrics',
		section: 'navigation',
		shortcut: ['Shift', 'M'],
		roles: ['ADMIN'], // ✅ now UserRole[]
		perform: jest.fn(),
	},
	{
		id: '3',
		name: 'Create Alert',
		section: 'actions',
		shortcut: ['A'],
		perform: jest.fn(),
	},
	{
		id: '4',
		name: 'Go to Logs',
		section: 'navigation',
		perform: jest.fn(),
	},
];

describe('ShiftOverlay', () => {
	it('renders nothing when not visible', () => {
		const { container } = render(
			<ShiftOverlay visible={false} actions={baseActions} userRole="ADMIN" />,
		);

		expect(container.firstChild).toBeNull();
	});

	it('renders nothing when no navigation shortcuts exist', () => {
		const { container } = render(
			<ShiftOverlay
				visible
				actions={[
					{
						id: 'x',
						name: 'Create Alert',
						section: 'actions',
						perform: jest.fn(),
					},
				]}
				userRole="ADMIN"
			/>,
		);

		expect(container.firstChild).toBeNull();
	});

	it('renders navigation shortcuts in a portal', () => {
		render(<ShiftOverlay visible actions={baseActions} userRole="ADMIN" />);

		expect(document.body.querySelector('.shift-overlay')).toBeInTheDocument();

		expect(screen.getByText('Traces')).toBeInTheDocument();
		expect(screen.getByText('Metrics')).toBeInTheDocument();

		expect(screen.getByText('Shift+T')).toBeInTheDocument();
		expect(screen.getByText('Shift+M')).toBeInTheDocument();
	});

	it('applies RBAC filtering correctly', () => {
		render(<ShiftOverlay visible actions={baseActions} userRole="VIEWER" />);

		expect(screen.getByText('Traces')).toBeInTheDocument();
		expect(screen.queryByText('Metrics')).not.toBeInTheDocument();
	});

	it('strips "Go to" prefix from labels', () => {
		render(<ShiftOverlay visible actions={baseActions} userRole="ADMIN" />);

		expect(screen.getByText('Traces')).toBeInTheDocument();
		expect(screen.queryByText('Go to Traces')).not.toBeInTheDocument();
	});

	it('does not render actions without shortcuts', () => {
		render(<ShiftOverlay visible actions={baseActions} userRole="ADMIN" />);

		expect(screen.queryByText('Logs')).not.toBeInTheDocument();
	});
});
