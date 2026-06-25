import { useMemo } from 'react';
import { Button } from '@signozhq/ui/button';
import { DropdownMenuSimple, type MenuItem } from '@signozhq/ui/dropdown-menu';
import { CalendarClock, ChevronDown, User } from '@signozhq/icons';
import cx from 'classnames';

import type { UpdatedWindow } from '../../types';

import styles from './FilterZone.module.scss';

export interface CreatorOption {
	email: string;
	label: string;
}

const UPDATED_LABELS: Record<UpdatedWindow, string> = {
	any: 'Any time',
	today: 'Today',
	'7d': 'Last 7 days',
	'30d': 'Last 30 days',
};

const UPDATED_WINDOWS: UpdatedWindow[] = ['any', 'today', '7d', '30d'];

interface Props {
	createdBy: string[];
	updated: UpdatedWindow;
	creatorOptions: CreatorOption[];
	onCreatedByChange: (emails: string[]) => void;
	onUpdatedChange: (window: UpdatedWindow) => void;
}

function FilterChips({
	createdBy,
	updated,
	creatorOptions,
	onCreatedByChange,
	onUpdatedChange,
}: Props): JSX.Element {
	const createdByLabel = useMemo((): string => {
		if (createdBy.length === 0) {
			return 'Anyone';
		}
		if (createdBy.length === 1) {
			const match = creatorOptions.find((o) => o.email === createdBy[0]);
			return match?.label ?? createdBy[0];
		}
		return `${createdBy.length} people`;
	}, [createdBy, creatorOptions]);

	const createdByItems = useMemo<MenuItem[]>(() => {
		const items: MenuItem[] = creatorOptions.map((option) => ({
			type: 'checkbox',
			key: option.email,
			label: option.label,
			checked: createdBy.includes(option.email),
			onCheckedChange: (checked: boolean): void =>
				onCreatedByChange(
					checked
						? [...createdBy, option.email]
						: createdBy.filter((e) => e !== option.email),
				),
		}));
		if (createdBy.length > 0) {
			items.push({ type: 'divider', key: 'sep' });
			items.push({
				key: 'clear',
				label: 'Clear selection',
				onClick: (): void => onCreatedByChange([]),
			});
		}
		return items;
	}, [creatorOptions, createdBy, onCreatedByChange]);

	const updatedItems = useMemo<MenuItem[]>(
		() => [
			{
				type: 'radio-group',
				value: updated,
				onChange: (value: string): void => onUpdatedChange(value as UpdatedWindow),
				children: UPDATED_WINDOWS.map((window) => ({
					type: 'radio',
					key: window,
					value: window,
					label: UPDATED_LABELS[window],
				})),
			},
		],
		[updated, onUpdatedChange],
	);

	return (
		<div className={styles.chips}>
			<DropdownMenuSimple menu={{ items: createdByItems }} align="start">
				<Button
					variant="outlined"
					color="secondary"
					size="sm"
					prefix={<User size={12} />}
					suffix={<ChevronDown size={12} />}
					className={cx(styles.chip, {
						[styles.chipActive]: createdBy.length > 0,
					})}
					testId="dashboards-filter-created-by"
				>
					Created by: {createdByLabel}
				</Button>
			</DropdownMenuSimple>

			<DropdownMenuSimple menu={{ items: updatedItems }} align="start">
				<Button
					variant="outlined"
					color="secondary"
					size="sm"
					prefix={<CalendarClock size={12} />}
					suffix={<ChevronDown size={12} />}
					className={cx(styles.chip, {
						[styles.chipActive]: updated !== 'any',
					})}
					testId="dashboards-filter-updated"
				>
					Updated: {UPDATED_LABELS[updated]}
				</Button>
			</DropdownMenuSimple>
		</div>
	);
}

export default FilterChips;
