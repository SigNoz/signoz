import { useMemo, useState } from 'react';
import { Search } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import cx from 'classnames';

import type { PanelKind } from '../../../Panels/types/panelKind';
import {
	filterPanelTypeGroups,
	type PanelTypeGroupId,
} from './panelTypeCatalog';
import PanelTypeTile from './PanelTypeTile';

import styles from './PanelTypeBrowser.module.scss';

type CategoryId = PanelTypeGroupId | 'all';

interface PanelTypeBrowserProps {
	selectedKind: PanelKind;
	onSelect: (kind: PanelKind) => void;
	getDisabledReason?: (kind: PanelKind) => string | undefined;
}

/** Searchable, category-filtered grid of panel types, grouped by purpose. */
function PanelTypeBrowser({
	selectedKind,
	onSelect,
	getDisabledReason,
}: PanelTypeBrowserProps): JSX.Element {
	const [query, setQuery] = useState('');
	const [category, setCategory] = useState<CategoryId>('all');

	const matched = useMemo(() => filterPanelTypeGroups(query), [query]);

	const categories = useMemo(
		() => [
			{
				id: 'all' as const,
				label: 'All',
				count: matched.reduce((sum, group) => sum + group.items.length, 0),
			},
			...matched.map(({ id, label, items }) => ({
				id,
				label,
				count: items.length,
			})),
		],
		[matched],
	);

	const visibleGroups = matched.filter(
		(group) =>
			group.items.length > 0 && (category === 'all' || group.id === category),
	);

	return (
		<div className={styles.browser}>
			<div className={styles.controls}>
				<Input
					value={query}
					onChange={(e): void => setQuery(e.target.value)}
					placeholder="Search panel types"
					prefix={<Search size={14} />}
					testId="panel-type-search"
					containerClassName={styles.search}
				/>
				<div className={styles.categories}>
					{categories.map(({ id, label, count }) => (
						<button
							key={id}
							type="button"
							className={cx(styles.category, {
								[styles.categoryActive]: category === id,
							})}
							aria-pressed={category === id}
							onClick={(): void => setCategory(id)}
						>
							{label}
							<span className={styles.categoryCount}>{count}</span>
						</button>
					))}
				</div>
			</div>

			<div className={styles.groups}>
				{visibleGroups.map((group) => (
					<section key={group.id} className={styles.group}>
						<span className={styles.groupLabel}>{group.label}</span>
						<div className={styles.grid}>
							{group.items.map((item) => (
								<PanelTypeTile
									key={item.kind}
									item={item}
									isSelected={item.kind === selectedKind}
									disabledReason={getDisabledReason?.(item.kind)}
									onSelect={(): void => onSelect(item.kind)}
								/>
							))}
						</div>
					</section>
				))}
				{visibleGroups.length === 0 && (
					<div className={styles.empty}>
						<span>No panel types match “{query}”</span>
						<Button
							variant="link"
							color="primary"
							size="sm"
							onClick={(): void => setQuery('')}
						>
							Clear search
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}

export default PanelTypeBrowser;
