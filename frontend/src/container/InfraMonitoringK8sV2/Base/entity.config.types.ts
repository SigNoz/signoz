import type { SelectedItemParams } from '../hooks';
import type { K8sBaseListProps } from './K8sBaseList';
import type { K8sBaseDetailsProps } from './types';

export type K8sEntityData = { meta?: Record<string, string> | null };

export type K8sEntityListConfig<
	T extends K8sEntityData,
	TItemKey extends string | SelectedItemParams = string,
> = Omit<K8sBaseListProps<T, TItemKey>, 'controlListPrefix' | 'leftFilters'>;

export type K8sEntityDetailsConfig<T extends K8sEntityData> =
	K8sBaseDetailsProps<T>;

export interface K8sEntityConfig<
	T extends K8sEntityData,
	TItemKey extends string | SelectedItemParams = string,
> {
	list: K8sEntityListConfig<T, TItemKey>;
	details: K8sEntityDetailsConfig<T>;
}
