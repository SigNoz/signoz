import './Home.styles.scss';

import { Typography } from 'antd';

export default function Home(): JSX.Element {
	return (
		<div className="home-container">
			<Typography>Welcome to SigNoz</Typography>
		</div>
	);
}
