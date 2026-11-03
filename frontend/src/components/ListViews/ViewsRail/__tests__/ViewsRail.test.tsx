import { Bookmark, Pin } from '@signozhq/icons';
import { fireEvent, render, screen } from 'tests/test-utils';

import type { BuiltinListView } from '../../types';
import ViewsRail from '../ViewsRail';

const PREFIX = 'things';

const BUILTIN_VIEWS: BuiltinListView[] = [
	{ id: 'mine', label: 'My things', icon: Pin, section: 'personal' },
	{ id: 'all', label: 'All things', icon: Bookmark, section: 'system' },
];

const CUSTOM_VIEWS = [
	{ id: 'view-1', name: 'Prod things' },
	{ id: 'view-2', name: 'Staging things' },
];

type Props = React.ComponentProps<typeof ViewsRail>;

function renderRail(props?: Partial<Props>): Props {
	const allProps: Props = {
		activeViewId: 'all',
		builtinViews: BUILTIN_VIEWS,
		customViews: CUSTOM_VIEWS,
		customViewsLoading: false,
		isCustomActive: false,
		isModified: false,
		onSelect: jest.fn(),
		onSave: jest.fn(),
		onSaveChanges: jest.fn(),
		onReset: jest.fn(),
		onDelete: jest.fn(),
		onRename: jest.fn(),
		testIdPrefix: PREFIX,
		...props,
	};
	render(<ViewsRail {...allProps} />);
	return allProps;
}

describe('ViewsRail', () => {
	it('groups built-in views by section and custom views under their label', () => {
		renderRail({ customSectionLabel: 'Team views' });

		expect(screen.getByText('Personal')).toBeInTheDocument();
		expect(screen.getByText('System')).toBeInTheDocument();
		expect(screen.getByText('Team views')).toBeInTheDocument();
		['mine', 'all', 'view-1', 'view-2'].forEach((id) =>
			expect(screen.getByTestId(`${PREFIX}-view-${id}`)).toBeInTheDocument(),
		);
	});

	it('selects a view by id', () => {
		const props = renderRail();

		fireEvent.click(screen.getByTestId(`${PREFIX}-view-view-2`));

		expect(props.onSelect).toHaveBeenCalledWith('view-2');
	});

	it('filters views by name and says when none match', () => {
		renderRail();
		const search = screen.getByTestId(`${PREFIX}-view-search`);

		fireEvent.change(search, { target: { value: 'prod' } });

		expect(screen.getByTestId(`${PREFIX}-view-view-1`)).toBeInTheDocument();
		expect(screen.queryByTestId(`${PREFIX}-view-view-2`)).not.toBeInTheDocument();
		expect(screen.queryByTestId(`${PREFIX}-view-all`)).not.toBeInTheDocument();

		fireEvent.change(search, { target: { value: 'nothing' } });

		expect(screen.getByText(/No views match/)).toBeInTheDocument();
	});

	it('shows loading and empty states for custom views', () => {
		const { unmount } = render(
			<ViewsRail
				activeViewId="all"
				builtinViews={BUILTIN_VIEWS}
				customViews={[]}
				customViewsLoading
				isCustomActive={false}
				isModified={false}
				onSelect={jest.fn()}
				onSave={jest.fn()}
				onSaveChanges={jest.fn()}
				onReset={jest.fn()}
				onDelete={jest.fn()}
				onRename={jest.fn()}
				testIdPrefix={PREFIX}
			/>,
		);
		expect(screen.getByText('Loading views…')).toBeInTheDocument();
		unmount();

		renderRail({ customViews: [] });
		expect(screen.getByText(/No saved views yet/)).toBeInTheDocument();
	});

	it('hides the unsaved-changes panel while filters match the view', () => {
		renderRail();

		expect(screen.queryByTestId(`${PREFIX}-view-reset`)).not.toBeInTheDocument();
	});

	it('offers save, save as and reset for a modified custom view', () => {
		const onViewSaved = jest.fn();
		const props = renderRail({
			activeViewId: 'view-1',
			isCustomActive: true,
			isModified: true,
			onViewSaved,
		});

		fireEvent.click(screen.getByTestId(`${PREFIX}-view-save-changes`));
		expect(onViewSaved).toHaveBeenCalledWith('update');
		expect(props.onSaveChanges).toHaveBeenCalledTimes(1);

		expect(screen.getByTestId(`${PREFIX}-view-save-as`)).toBeInTheDocument();

		fireEvent.click(screen.getByTestId(`${PREFIX}-view-reset`));
		expect(props.onReset).toHaveBeenCalledTimes(1);
	});

	it('offers only save as new for a modified built-in view', () => {
		renderRail({ isModified: true });

		expect(screen.getByTestId(`${PREFIX}-view-save-as-new`)).toBeInTheDocument();
		expect(
			screen.queryByTestId(`${PREFIX}-view-save-changes`),
		).not.toBeInTheDocument();
	});

	it('wraps its body in the guard it is given', () => {
		renderRail({
			guard: (content): JSX.Element => (
				<div data-testid="rail-guard">{content}</div>
			),
		});

		expect(screen.getByTestId('rail-guard')).toContainElement(
			screen.getByTestId(`${PREFIX}-view-all`),
		);
	});
});
