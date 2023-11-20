import { Spin, Typography } from 'antd';
import ROUTES from 'constants/routes';
import useLicense, { LICENSE_PLAN_KEY } from 'hooks/useLicense';
import history from 'lib/history';

import {
	FreePlanIcon,
	ManageLicenseContainer,
	ManageLicenseWrapper,
} from './styles';

function ManageLicense({ onToggle }: ManageLicenseProps): JSX.Element {
	const { data, isLoading } = useLicense();

	const onManageLicense = (): void => {
		onToggle();
		history.push(ROUTES.LIST_LICENSES);
	};

	if (isLoading || data?.payload === undefined) {
		return <Spin />;
	}

	const isEnterprise = data?.payload?.licenses?.some(
		(license) =>
			license.isCurrent && license.planKey === LICENSE_PLAN_KEY.ENTERPRISE_PLAN,
	);

	return (
		<>
			<Typography>SIGNOZ STATUS</Typography>

			<ManageLicenseContainer>
				<ManageLicenseWrapper>
					<FreePlanIcon />
					<Typography>{!isEnterprise ? 'Free Plan' : 'Enterprise Plan'} </Typography>
				</ManageLicenseWrapper>

				<Typography.Link onClick={onManageLicense}>Manage Licenses</Typography.Link>
			</ManageLicenseContainer>
		</>
	);
}

interface ManageLicenseProps {
	onToggle: VoidFunction;
}

export default ManageLicense;
