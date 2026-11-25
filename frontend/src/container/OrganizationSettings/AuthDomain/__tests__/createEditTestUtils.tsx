import type { MouseEventHandler, ReactNode } from 'react';
import type { AuthtypesUpdatableAuthDomainDTO } from 'api/generated/services/sigNoz.schemas';
import { rest, server } from 'mocks-server/server';

import {
	AUTH_DOMAINS_UPDATE_ENDPOINT,
	mockUpdateSuccessResponse,
} from './mocks';

interface MockButtonProps {
	children?: ReactNode;
	onClick?: MouseEventHandler<HTMLButtonElement>;
	loading?: boolean;
	disabled?: boolean;
	'aria-label'?: string;
	prefix?: ReactNode;
	suffix?: ReactNode;
	testId?: string;
}

export function buttonModuleMock(): Record<string, unknown> {
	return {
		...jest.requireActual('@signozhq/ui/button'),
		Button: ({
			children,
			onClick,
			loading,
			disabled,
			'aria-label': ariaLabel,
			prefix,
			suffix,
			testId,
		}: MockButtonProps): JSX.Element => (
			<button
				type="button"
				onClick={onClick}
				disabled={disabled || loading}
				aria-label={ariaLabel}
				data-testid={testId}
			>
				{prefix}
				{children}
				{suffix}
			</button>
		),
	};
}

export function captureUpdatePayload(): {
	get: () => AuthtypesUpdatableAuthDomainDTO | null;
} {
	let payload: AuthtypesUpdatableAuthDomainDTO | null = null;
	server.use(
		rest.put(AUTH_DOMAINS_UPDATE_ENDPOINT, async (req, res, ctx) => {
			payload = await req.json();
			return res(ctx.status(200), ctx.json(mockUpdateSuccessResponse));
		}),
	);
	return { get: (): AuthtypesUpdatableAuthDomainDTO | null => payload };
}
