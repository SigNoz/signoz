import { Typography } from 'antd';
import axios from 'axios';
import Spinner from 'components/Spinner';
import { themeColors } from 'constants/theme';
import { useGetApDexSettings } from 'hooks/apDex/useGetApDexSettings';
import { useNotifications } from 'hooks/useNotifications';
import { useParams } from 'react-router-dom';

import { spinnerStyles } from './config';
import { DisplayThresholdContainer } from './styles';

function DisplayThreshold(): JSX.Element {
	const { servicename } = useParams<{ servicename: string }>();

	const { data, isLoading, error, isRefetching } = useGetApDexSettings(
		servicename,
	);

	const { notifications } = useNotifications();

	if (error && axios.isAxiosError(error)) {
		notifications.error({
			message: error.message,
		});
		return <>0</>;
	}

	return (
		<DisplayThresholdContainer>
			<div>Threshold</div>
			{isLoading || isRefetching ? (
				<Spinner height="5vh" style={spinnerStyles} />
			) : (
				<Typography.Text style={{ color: themeColors.white }}>
					{data?.data[0].threshold}
				</Typography.Text>
			)}
		</DisplayThresholdContainer>
	);
}

export default DisplayThreshold;
