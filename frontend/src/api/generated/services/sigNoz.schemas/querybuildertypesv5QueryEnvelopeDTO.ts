/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5QueryEnvelopeBuilderAIDTO } from './querybuildertypesv5QueryEnvelopeBuilderAIDTO';
import type { Querybuildertypesv5QueryEnvelopeBuilderDTO } from './querybuildertypesv5QueryEnvelopeBuilderDTO';
import type { Querybuildertypesv5QueryEnvelopeClickHouseSQLDTO } from './querybuildertypesv5QueryEnvelopeClickHouseSQLDTO';
import type { Querybuildertypesv5QueryEnvelopeFormulaDTO } from './querybuildertypesv5QueryEnvelopeFormulaDTO';
import type { Querybuildertypesv5QueryEnvelopePromQLDTO } from './querybuildertypesv5QueryEnvelopePromQLDTO';
import type { Querybuildertypesv5QueryEnvelopeTraceOperatorDTO } from './querybuildertypesv5QueryEnvelopeTraceOperatorDTO';

export type Querybuildertypesv5QueryEnvelopeDTO =
	| Querybuildertypesv5QueryEnvelopeBuilderDTO
	| Querybuildertypesv5QueryEnvelopeBuilderAIDTO
	| Querybuildertypesv5QueryEnvelopeFormulaDTO
	| Querybuildertypesv5QueryEnvelopeTraceOperatorDTO
	| Querybuildertypesv5QueryEnvelopePromQLDTO
	| Querybuildertypesv5QueryEnvelopeClickHouseSQLDTO;
