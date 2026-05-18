import { Breadcrumb, Divider } from 'antd';

import styles from './AlertBreadcrumb.module.scss';
import BreadcrumbItem, { BreadcrumbItemConfig } from './BreadcrumbItem';

export interface AlertBreadcrumbProps {
	items: BreadcrumbItemConfig[];
	className?: string;
	showDivider?: boolean;
}

function AlertBreadcrumb({
	items,
	className,
	showDivider = true,
}: AlertBreadcrumbProps): JSX.Element {
	const breadcrumbItems = items.map((item) => ({
		title: <BreadcrumbItem {...item} />,
	}));

	return (
		<>
			<Breadcrumb
				className={`${styles.breadcrumb} ${className || ''}`}
				items={breadcrumbItems}
			/>
			{showDivider && <Divider className={styles.divider} />}
		</>
	);
}

export default AlertBreadcrumb;
