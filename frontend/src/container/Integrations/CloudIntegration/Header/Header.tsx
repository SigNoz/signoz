import { Link } from 'react-router-dom';
import { Button } from '@signozhq/button';
import Breadcrumb from 'antd/es/breadcrumb';
import ROUTES from 'constants/routes';
import { IntegrationType } from 'container/Integrations/types';
import { Blocks, LifeBuoy } from 'lucide-react';

import './Header.styles.scss';

function Header({ title }: { title: IntegrationType }): JSX.Element {
	return (
		<div className="cloud-header">
			<div className="cloud-header__navigation">
				<Breadcrumb
					className="cloud-header__breadcrumb"
					items={[
						{
							title: (
								<Link to={ROUTES.INTEGRATIONS}>
									<span className="cloud-header__breadcrumb-link">
										<Blocks size={16} color="var(--bg-vanilla-400)" />
										<span className="cloud-header__breadcrumb-title">Integrations</span>
									</span>
								</Link>
							),
						},
						{
							title: <div className="cloud-header__breadcrumb-title">{title}</div>,
						},
					]}
				/>
			</div>
			<div className="cloud-header__actions">
				<Button
					variant="solid"
					size="sm"
					color="secondary"
					onClick={(): void => {
						window.open(
							'https://signoz.io/blog/native-aws-integrations-with-autodiscovery/',
							'_blank',
						);
					}}
					prefixIcon={<LifeBuoy size={12} />}
				>
					Get Help
				</Button>
			</div>
		</div>
	);
}

export default Header;
