import {
	Card as CardComponent,
	Form,
	Space as SpaceComponent,
	Typography,
} from 'antd';
import styled from 'styled-components';

export const CustomGraphContainer = styled.div`
	min-height: 30vh;
`;

export const Card = styled(CardComponent)`
	.ant-card-body {
		padding-bottom: 0;
	}
`;

export const CustomVisualizationsTitle = styled(Typography)`
	margin-bottom: 1rem;
`;

export const FormItem = styled(Form.Item)`
	&&& {
		margin: 0;
	}
`;

export const Space = styled(SpaceComponent)`
	&&& {
		display: flex;
		flex-wrap: wrap;
	}
`;
