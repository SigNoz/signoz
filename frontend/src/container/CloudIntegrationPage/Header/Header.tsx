import './Header.styles.scss';

import Breadcrumb from 'antd/es/breadcrumb';
import ROUTES from 'constants/routes';
import { Blocks, LifeBuoy } from 'lucide-react';
import { Link } from 'react-router-dom';

function Header(): JSX.Element {
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
							title: (
								<div className="cloud-header__breadcrumb-title">
									Amazon Web Services
								</div>
							),
						},
					]}
				/>
			</div>
			<div className="cloud-header__actions">
				<button className="cloud-header__help" type="button">
					<LifeBuoy size={12} />
					Get Help
				</button>
			</div>
		</div>
	);
}

export default Header;
