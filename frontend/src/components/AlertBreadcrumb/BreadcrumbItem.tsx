import { Button } from '@signozhq/ui/button';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { isModifierKeyPressed } from 'utils/app';

import styles from './BreadcrumbItem.module.scss';

export type BreadcrumbItemConfig =
	| {
			title: string | null;
			route?: string;
	  }
	| {
			title: string | null;
			isLast?: true;
	  };

function BreadcrumbItem({
	title,
	...props
}: BreadcrumbItemConfig): JSX.Element {
	const { safeNavigate } = useSafeNavigate();

	if ('isLast' in props) {
		return <div className={styles.itemLast}>{title}</div>;
	}

	return (
		<Button
			variant="ghost"
			color="secondary"
			className={styles.item}
			onClick={(e: React.MouseEvent): void => {
				if (!('route' in props) || !props.route) {
					return;
				}

				safeNavigate(props.route, { newTab: isModifierKeyPressed(e) });
			}}
		>
			{title}
		</Button>
	);
}

export default BreadcrumbItem;
