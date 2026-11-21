/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface InframonitoringtypesPodCountsByStatusDTO {
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
	evicted: number;
	/**
	 * @type integer
	 */
	failed: number;
	/**
	 * @type integer
	 */
	imagePullBackOff: number;
	/**
	 * @type integer
	 */
	nodeAffinity: number;
	/**
	 * @type integer
	 */
	nodeLost: number;
	/**
	 * @type integer
	 */
	oomKilled: number;
	/**
	 * @type integer
	 */
	pending: number;
	/**
	 * @type integer
	 */
	running: number;
	/**
	 * @type integer
	 */
	shutdown: number;
	/**
	 * @type integer
	 */
	unexpectedAdmissionError: number;
	/**
	 * @type integer
	 */
	unknown: number;
}
