import { MinusSquareOutlined } from '@ant-design/icons';
import styled from 'styled-components';

export const ManageLicenseContainer = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-top: 1rem;
`;

export const ManageLicenseWrapper = styled.div`
	display: flex;
	gap: 0.5rem;
	align-items: center;
`;

export const FreePlanIcon = styled(MinusSquareOutlined)`
	background-color: hsla(0, 0%, 100%, 0.3);
`;
