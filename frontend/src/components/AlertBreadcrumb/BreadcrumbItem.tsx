import { Button } from 'antd';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { isModifierKeyPressed } from 'utils/app';

import styles from './BreadcrumbItem.module.scss';

export interface BreadcrumbItemConfig {
	title: string | null;
	route?: string;
	isLast?: boolean;
}

function BreadcrumbItem({
	title,
	isLast,
	route,
}: BreadcrumbItemConfig): JSX.Element {
	const { safeNavigate } = useSafeNavigate();

	const handleNavigate = (e: React.MouseEvent): void => {
		if (!route) {
			return;
		}
		safeNavigate(route, { newTab: isModifierKeyPressed(e) });
	};

	if (isLast) {
		return <div className={styles.itemLast}>{title}</div>;
	}

	return (
		<Button type="text" className={styles.item} onClick={handleNavigate}>
			{title}
		</Button>
	);
}

export default BreadcrumbItem;
