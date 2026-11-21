/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

/**
 * Labels attached to every alert the rule fires. Keys match [a-zA-Z_.][a-zA-Z0-9_.]*; values may use Go templates such as {{$labels.service_name}}. A label named after one the engine writes, such as severity or threshold.name, is ignored.
 */
export type RuletypesRuleDTOLabels = { [key: string]: string };
