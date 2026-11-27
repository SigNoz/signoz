interface SubmitBlockedReasonArgs {
	canUpdate: boolean;
	name: string;
	savedName: string;
}

// A permission denial is left to AuthZButton, which names the missing scope.
export function getSubmitBlockedReason({
	canUpdate,
	name,
	savedName,
}: SubmitBlockedReasonArgs): string | undefined {
	if (!canUpdate) {
		return undefined;
	}
	if (name === savedName) {
		return 'No change detected';
	}
	if (!name) {
		return "Can't be empty";
	}
	return undefined;
}
