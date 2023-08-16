import { Select, Space } from 'antd';
import styled from 'styled-components';

export const SelectDrawer = styled(Select)`
	width: 120px;
`;

export const TitleWrapper = styled.div`
	display: flex;
	margin-bottom: 1rem;

	> article {
		min-width: 11rem;
	}
`;

export const SpaceContainer = styled(Space)`
	& .ant-form-item {
		margin-bottom: 0px;
	}
`;
