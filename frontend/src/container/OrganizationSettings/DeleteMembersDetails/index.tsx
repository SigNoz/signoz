import { gold } from '@ant-design/colors';
import { ExclamationCircleTwoTone } from '@ant-design/icons';
import { Space, Typography } from 'antd';

function DeleteMembersDetails({
	name,
}: DeleteMembersDetailsProps): JSX.Element {
	return (
		<div>
			<Space direction="horizontal" size="middle" align="start">
				<ExclamationCircleTwoTone
					twoToneColor={[gold[6], '#1f1f1f']}
					style={{
						fontSize: '1.4rem',
					}}
				/>
				<Space direction="vertical">
					<Typography>Are you sure you want to delete {name}</Typography>
					<Typography>
						This will remove all access from dashboards and other features in SigNoz
					</Typography>
				</Space>
			</Space>
		</div>
	);
}

interface DeleteMembersDetailsProps {
	name: string;
}

export default DeleteMembersDetails;
