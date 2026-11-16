import type { MouseEvent } from 'react';
import { HardDrive } from '@signozhq/icons';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '@signozhq/ui/breadcrumb';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { isModifierKeyPressed } from 'utils/app';

import styles from './ServiceBreadcrumbs.module.scss';

interface ServiceBreadcrumbsProps {
	serviceName: string;
}

function ServiceBreadcrumbs({
	serviceName,
}: ServiceBreadcrumbsProps): JSX.Element {
	const { safeNavigate } = useSafeNavigate();

	// The href serves middle and modifier clicks; a plain click stays client-side.
	const onServicesClick = (event: MouseEvent<HTMLAnchorElement>): void => {
		if (isModifierKeyPressed(event)) {
			return;
		}
		event.preventDefault();
		safeNavigate(ROUTES.APPLICATION);
	};

	return (
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink
						icon={<HardDrive size={14} />}
						href={ROUTES.APPLICATION}
						onClick={onServicesClick}
						data-testid="service-details-breadcrumb-services"
					>
						Services
					</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator>/</BreadcrumbSeparator>
				<BreadcrumbItem>
					<BreadcrumbLink>
						<span
							className={styles.service}
							title={serviceName}
							data-testid="service-details-name"
						>
							{serviceName}
						</span>
					</BreadcrumbLink>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	);
}

export default ServiceBreadcrumbs;
