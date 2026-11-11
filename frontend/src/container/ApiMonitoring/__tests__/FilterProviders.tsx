import { ReactNode } from 'react';
import { QuerySearchV2Provider } from 'components/QueryBuilderV2';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { onNuqsUrlUpdate } from 'tests/nuqs-helpers';

/** Mounts a drawer tab's filter provider over an in-memory URL. */
export function FilterProviders({
	queryParamKey,
	searchParams = '',
	children,
}: {
	queryParamKey: string;
	searchParams?: string;
	children: ReactNode;
}): JSX.Element {
	return (
		<NuqsTestingAdapter
			searchParams={searchParams}
			onUrlUpdate={onNuqsUrlUpdate}
			rateLimitFactor={0}
			hasMemory
		>
			<QuerySearchV2Provider queryParamKey={queryParamKey} persistOnUnmount>
				{children}
			</QuerySearchV2Provider>
		</NuqsTestingAdapter>
	);
}
