import {AnalysisError} from './analysis-types.js';
import type {AnalysisRequest,AnalysisRequestOptions} from './analysis-types.js';
export function analysisRequestLimits(options:AnalysisRequestOptions):AnalysisRequest['limits'] {
  if (!options || typeof options!=='object' || Array.isArray(options) || Object.keys(options).some(key => !['maxVisits','maxPvLength','includeOwnership'].includes(key))) throw new AnalysisError('invalid-request','Invalid analysis request options.');
  const maxVisits=options.maxVisits===undefined ? 1000 : options.maxVisits,maxPvLength=options.maxPvLength===undefined ? 16 : options.maxPvLength,
    includeOwnership=options.includeOwnership===undefined ? false : options.includeOwnership;
  if (!Number.isInteger(maxVisits) || maxVisits<1 || maxVisits>1e6 || !Number.isInteger(maxPvLength) || maxPvLength<0 || maxPvLength>256 || typeof includeOwnership!=='boolean') throw new AnalysisError('invalid-request','Analysis request limits are invalid.');
  return Object.freeze({maxVisits,maxPvLength,includeOwnership});
}
