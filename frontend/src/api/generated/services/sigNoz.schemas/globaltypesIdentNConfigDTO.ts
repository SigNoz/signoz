/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { GlobaltypesAPIKeyConfigDTO } from './globaltypesAPIKeyConfigDTO';
import type { GlobaltypesImpersonationConfigDTO } from './globaltypesImpersonationConfigDTO';
import type { GlobaltypesTokenizerConfigDTO } from './globaltypesTokenizerConfigDTO';

export interface GlobaltypesIdentNConfigDTO {
	apikey?: GlobaltypesAPIKeyConfigDTO;
	impersonation?: GlobaltypesImpersonationConfigDTO;
	tokenizer?: GlobaltypesTokenizerConfigDTO;
}
