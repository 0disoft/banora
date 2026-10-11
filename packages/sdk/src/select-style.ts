/** Widget-owned selectors only; keep the host's native controls untouched. */
export function selectStyles(scope: string): string {
  const selector = `${scope} select:not([multiple]):not([size]),${scope} select[size="1"]:not([multiple])`;
  const rtlSelector = selector
    .split(',')
    .map((part) => `${part}:dir(rtl)`)
    .join(',');
  return `
${selector}{appearance:none;box-sizing:border-box;max-width:100%;padding-inline-end:32px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='m1 1 5 5 5-5' fill='none' stroke='%23738078' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;background-size:12px 8px}
${rtlSelector}{background-position:left 12px center}
@media(forced-colors:active){${selector}{appearance:auto;background-image:none}}
`;
}
