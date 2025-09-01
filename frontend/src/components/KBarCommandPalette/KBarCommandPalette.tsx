import './KBarCommandPalette.scss';

import {
	KBarAnimator,
	KBarPortal,
	KBarPositioner,
	KBarResults,
	KBarSearch,
	useMatches,
} from 'kbar';

function Results(): JSX.Element {
	const { results } = useMatches();

	const renderResults = ({
		item,
		active,
	}: {
		item: any;
		active: boolean;
	}): JSX.Element =>
		typeof item === 'string' ? (
			<div className="kbar-command-palette__section">{item}</div>
		) : (
			<div
				className={`kbar-command-palette__item ${
					active ? 'kbar-command-palette__item--active' : ''
				}`}
			>
				{item.icon}
				<span>{item.name}</span>
				{item.shortcut?.length ? (
					<span className="kbar-command-palette__shortcut">
						{item.shortcut.map((sc: string) => (
							<kbd key={sc} className="kbar-command-palette__key">
								{sc}
							</kbd>
						))}
					</span>
				) : null}
			</div>
		);

	return (
		<div className="kbar-command-palette__results-container">
			<KBarResults items={results} onRender={renderResults} />
		</div>
	);
}

function KBarCommandPalette(): JSX.Element {
	return (
		<KBarPortal>
			<KBarPositioner className="kbar-command-palette__positioner">
				<KBarAnimator className="kbar-command-palette__animator">
					<div className="kbar-command-palette__card">
						<KBarSearch
							className="kbar-command-palette__search"
							placeholder="Search or type a command..."
						/>
						<Results />
					</div>
				</KBarAnimator>
			</KBarPositioner>
		</KBarPortal>
	);
}

export default KBarCommandPalette;
