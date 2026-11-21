/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface InframonitoringtypesContainerCountsByStatusDTO {
	/**
	 * @type integer
	 */
	completed: number;
	/**
	 * @type integer
	 */
	containerCannotRun: number;
	/**
	 * @type integer
	 */
	containerCreating: number;
	/**
	 * @type integer
	 */
	crashLoopBackOff: number;
	/**
	 * @type integer
	 */
	createContainerConfigError: number;
	/**
	 * @type integer
	 */
	errImagePull: number;
	/**
	 * @type integer
	 */
	error: number;
	/**
	 * @type integer
	 */
	imagePullBackOff: number;
	/**
	 * @type integer
	 */
	oomKilled: number;
	/**
	 * @type integer
	 */
	running: number;
	/**
	 * @type integer
	 */
	terminated: number;
	/**
	 * @type integer
	 */
	unknown: number;
	/**
	 * @type integer
	 */
	waiting: number;
}
