import { patchRuleByID } from 'api/generated/services/rules';
import type { RuletypesPostableRuleDTO } from 'api/generated/services/sigNoz.schemas';

// why: patchRuleByID's generated body type is the full RuletypesPostableRuleDTO
// because the backend OpenAPI spec currently advertises PostableRule. The
// endpoint itself accepts any subset of fields. Until the backend introduces
// PatchableRule, this wrapper localizes the cast so callers stay typed.
export const patchRulePartial = (
	id: string,
	patch: Partial<RuletypesPostableRuleDTO>,
): ReturnType<typeof patchRuleByID> =>
	patchRuleByID({ id }, patch as RuletypesPostableRuleDTO);
