import { Typography } from 'antd';
import Spinner from 'components/Spinner';
import { themeColors } from 'constants/theme';
import { useGetApDexSettings } from 'hooks/apDex/useGetApDexSettings';
import { useParams } from 'react-router-dom';

import { spinnerStyles } from './config';

function DisplayThreshold(): JSX.Element {
	const { servicename } = useParams<{ servicename: string }>();

	const { data, isLoading } = useGetApDexSettings(servicename);

	return (
		<>
			Threshold{' '}
			{isLoading ? (
				<Spinner height="5vh" style={spinnerStyles} />
			) : (
				<Typography.Text style={{ color: themeColors.white }}>
					{data?.threshold}
				</Typography.Text>
			)}
		</>
	);
}

export default DisplayThreshold;
