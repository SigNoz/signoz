import { Breadcrumb } from 'antd';
import { Divider } from '@signozhq/ui/divider';

import styles from './AlertBreadcrumb.module.scss';
import BreadcrumbItem, { BreadcrumbItemConfig } from './BreadcrumbItem';

export interface AlertBreadcrumbProps {
	items: BreadcrumbItemConfig[];
	className?: string;
	showDivider?: boolean;
	testId?: string;
}

function AlertBreadcrumb({
	items,
	className,
	showDivider = true,
	testId,
}: AlertBreadcrumbProps): JSX.Element {
	const breadcrumbItems = items.map((item) => ({
		title: <BreadcrumbItem {...item} />,
	}));

	return (
		<>
			<Breadcrumb
				className={`${styles.breadcrumb} ${className || ''}`}
				items={breadcrumbItems}
				data-testid={testId}
			/>
			{showDivider && (
				<div className={styles.divider}>
					<Divider spacing="10px 16px" />
				</div>
			)}
		</>
	);
}

export default AlertBreadcrumb;
