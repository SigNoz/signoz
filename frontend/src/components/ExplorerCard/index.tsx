import { Card, Space, Typography } from 'antd';
import TextToolTip from 'components/TextToolTip';

import { QUERY_BUILDER_URL } from '../../constants/app';

function ExplorerCard({ children }: Props): JSX.Element {
	return (
		<Card
			size="small"
			title={
				<Space>
					<Typography>Query Builder</Typography>
					<TextToolTip
						url={QUERY_BUILDER_URL}
						text="More details on how to use query builder"
					/>
				</Space>
			}
		>
			{children}
		</Card>
	);
}

interface Props {
	children: React.ReactNode;
}

export default ExplorerCard;
