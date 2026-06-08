import { useMemo } from 'react';
// eslint-disable-next-line signoz/no-antd-components -- TODO: migrate Dropdown to @signozhq/ui/dropdown-menu
import { Button, Dropdown, MenuProps } from 'antd';
import cx from 'classnames';
import logEvent from 'api/common/logEvent';
import {
	ExternalLink,
	Github,
	LayoutGrid,
	Plus,
	Radius,
} from '@signozhq/icons';

import styles from './CreateDashboardDropdown.module.scss';

interface Props {
	canCreate: boolean;
	onCreate: () => void;
	onImportJSON: () => void;
	variant?: 'primary' | 'text';
}

const TEMPLATES_HREF =
	'https://signoz.io/docs/dashboards/dashboard-templates/overview/';

function CreateDashboardDropdown({
	canCreate,
	onCreate,
	onImportJSON,
	variant = 'primary',
}: Props): JSX.Element {
	const items: MenuProps['items'] = useMemo(() => {
		const menuItems: MenuProps['items'] = [
			{
				key: 'import-json',
				label: (
					<div
						className={styles.menuItem}
						data-testid="import-json-menu-cta"
						onClick={onImportJSON}
					>
						<Radius size={14} /> Import JSON
					</div>
				),
			},
			{
				key: 'view-templates',
				label: (
					<a
						href={TEMPLATES_HREF}
						target="_blank"
						rel="noopener noreferrer"
						data-testid="view-templates-menu-cta"
					>
						<div className={styles.templatesItem}>
							<div className={styles.menuItem}>
								<Github size={14} /> View templates
							</div>
							<ExternalLink size={14} />
						</div>
					</a>
				),
			},
		];

		if (canCreate) {
			menuItems.unshift({
				key: 'create-dashboard',
				label: (
					<div
						className={styles.menuItem}
						data-testid="create-dashboard-menu-cta"
						onClick={onCreate}
					>
						<LayoutGrid size={14} /> Create dashboard
					</div>
				),
			});
		}

		return menuItems;
	}, [canCreate, onCreate, onImportJSON]);

	return (
		<Dropdown
			overlayClassName="createDashboardMenuOverlay"
			menu={{ items }}
			placement="bottomRight"
			trigger={['click']}
		>
			{variant === 'primary' ? (
				<Button
					type="primary"
					className={cx('periscope-btn primary', styles.primaryButton)}
					icon={<Plus size={14} />}
					data-testid="new-dashboard-cta"
					onClick={(): void => {
						logEvent('Dashboard List: New dashboard clicked', {});
					}}
				>
					New dashboard
				</Button>
			) : (
				<Button
					type="text"
					className={styles.textButton}
					icon={<Plus size={14} />}
					onClick={(): void => {
						logEvent('Dashboard List: New dashboard clicked', {});
					}}
				>
					New Dashboard
				</Button>
			)}
		</Dropdown>
	);
}

export default CreateDashboardDropdown;
