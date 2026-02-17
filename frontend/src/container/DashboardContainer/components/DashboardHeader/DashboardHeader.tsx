import { Button } from 'antd';
import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { LayoutGrid } from 'lucide-react';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { DashboardData } from 'types/api/dashboard/getAll';

import { Base64Icons } from '../../DashboardSettings/General/utils';

import './Description.styles.scss';

function DashboardHeader(): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const { selectedDashboard, listSortOrder } = useDashboard();

	const selectedData = selectedDashboard
		? {
				...selectedDashboard.data,
				uuid: selectedDashboard.id,
		  }
		: ({} as DashboardData);

	const { title = '', image = Base64Icons[0] } = selectedData || {};

	function goToListPage(): void {
		const urlParams = new URLSearchParams();
		urlParams.set('columnKey', listSortOrder.columnKey as string);
		urlParams.set('order', listSortOrder.order as string);
		urlParams.set('page', listSortOrder.pagination as string);
		urlParams.set('search', listSortOrder.search as string);

		const generatedUrl = `${ROUTES.ALL_DASHBOARD}?${urlParams.toString()}`;
		safeNavigate(generatedUrl);
	}

	return (
		<div className="dashboard-header">
			<section className="dashboard-breadcrumbs">
				<Button
					type="text"
					icon={<LayoutGrid size={14} />}
					className="dashboard-btn"
					onClick={(): void => goToListPage()}
				>
					Dashboard /
				</Button>
				<Button type="text" className="id-btn dashboard-name-btn">
					<img
						src={image}
						alt="dashboard-icon"
						style={{ height: '14px', width: '14px' }}
					/>
					{title}
				</Button>
			</section>

			<HeaderRightSection enableAnnouncements={false} enableShare enableFeedback />
		</div>
	);
}

export default DashboardHeader;
