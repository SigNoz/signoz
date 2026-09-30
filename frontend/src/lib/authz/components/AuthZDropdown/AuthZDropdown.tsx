import { useCallback, useMemo, useState } from 'react';
import { Dropdown } from '@signozhq/ui/dropdown';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { useAppContext } from 'providers/App/App';

import type { AuthZDropdownProps } from './types';
import { applyAuthZ, collectChecks } from './utils';

/**
 * A Dropdown whose rows take optional `checks`. A denied row is disabled with the
 * standard denial wording; a row still waiting on its check shows as loading.
 *
 * Checks run only once the menu has been opened, so a list of rows does not pay
 * for a menu nobody looked at.
 */
function AuthZDropdown({
	items,
	onOpenChange,
	...dropdownProps
}: AuthZDropdownProps): JSX.Element {
	const { user } = useAppContext();
	const [hasOpened, setHasOpened] = useState(false);

	const checks = useMemo(() => collectChecks(items), [items]);
	const { permissions, isLoading, error } = useAuthZ(checks, {
		enabled: hasOpened && checks.length > 0,
	});
	// The query only reports loading once its fetch starts, a render after the
	// menu opens; without this the gated rows flash enabled first.
	const isPending =
		isLoading || (!error && checks.some((p) => !permissions?.[p]));

	const gatedItems = useMemo(
		() =>
			applyAuthZ(items, { permissions, isLoading: isPending, userId: user.id }),
		[items, permissions, isPending, user.id],
	);

	const handleOpenChange = useCallback(
		(open: boolean): void => {
			if (open) {
				setHasOpened(true);
			}
			onOpenChange?.(open);
		},
		[onOpenChange],
	);

	return (
		<Dropdown
			{...dropdownProps}
			items={gatedItems}
			onOpenChange={handleOpenChange}
		/>
	);
}

export default AuthZDropdown;
