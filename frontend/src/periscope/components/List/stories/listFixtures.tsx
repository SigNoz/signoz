import { CircleArrowRight } from '@signozhq/icons';

import type { ListItemMetaProps, ListItemProps } from '../types';
import styles from './ListComparison.module.scss';

export interface FixtureItem {
	key: string;
	title: string;
	description: string;
}

export interface FixtureOptions {
	avatar: boolean;
	description: boolean;
	actions: boolean;
	extra: boolean;
}

export const FIXTURE_ITEMS: FixtureItem[] = Array.from(
	{ length: 12 },
	(_, index) => ({
		key: `item-${index}`,
		title: `Item ${index + 1}`,
		description: `Description of item ${index + 1}`,
	}),
);

export function getFixtureItemProps(
	item: FixtureItem,
	{ actions, extra }: FixtureOptions,
): Pick<ListItemProps, 'actions' | 'extra'> {
	return {
		actions: actions
			? [
					<a key="edit" href="#edit">
						Edit
					</a>,
					<a key="more" href="#more">
						More
					</a>,
				]
			: undefined,
		extra: extra ? <div className={styles.extra}>{item.key}</div> : undefined,
	};
}

export function getFixtureMetaProps(
	item: FixtureItem,
	{ avatar, description }: FixtureOptions,
): Pick<ListItemMetaProps, 'avatar' | 'title' | 'description'> {
	return {
		avatar: avatar ? <CircleArrowRight size={16} /> : undefined,
		title: <a href={`#${item.key}`}>{item.title}</a>,
		description: description ? (
			<>
				{item.description} <a href={`#${item.key}-docs`}>docs</a>
			</>
		) : undefined,
	};
}
