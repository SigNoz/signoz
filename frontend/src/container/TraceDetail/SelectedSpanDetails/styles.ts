import { Typography } from 'antd';
import styled from 'styled-components';
const { Text, Title, Paragraph } = Typography;

export const CustomTitle = styled(Title)`
	&&& {
		color: #f2f2f2;
		font-size: 14px;
	}
`;

export const CustomText = styled(Text)`
	&&& {
		color: #2d9cdb;
		font-size: 14px;
	}
`;

export const CustomSubTitle = styled(Title)`
	&&& {
		color: #bdbdbd;
		font-size: 14px;
		margin-bottom: 8px;
	}
`;

export const CustomSubText = styled(Paragraph)`
	&&& {
		background: #4f4f4f;
		color: #2d9cdb;
		font-size: 12px;
		padding: 6px 8px;
		word-break: break-all;
		margin-bottom: 16px;
	}
`;

export const CardContainer = styled.div`
	margin: 0 0.5rem;
	position: absolute;
	height: 100%;
	width: 100%;
	flex: 1;
	overflow: scroll;
`;
