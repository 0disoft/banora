/** Request execution limits; diagnostic retention and record-tool bounds are separate policies. */
export const AUTOMATION_LIMITS = Object.freeze({
  operations: 256,
  recordToolCalls: 8,
  legalPointCells: 8192,
});
