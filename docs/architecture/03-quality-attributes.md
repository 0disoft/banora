# Quality Attributes

- Status: Design targets; not measured guarantees

| Attribute        | Target                                                                        | Evidence before claiming support                                         |
| ---------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Correctness      | Consistent captures, legality, history and declared rule policies             | Focused rule/record fixtures with equivalent browser/server results      |
| Record integrity | Preserve covered SGF semantics, branches and comments                         | Parse/edit/export/reparse representative real records                    |
| Accessibility    | Keyboard operation, visible focus, accessible controls and move announcements | Keyboard and assistive-technology smoke checks for shipped UI            |
| Mobile usability | Accurate touch targeting and optional placement confirmation                  | Real-device or representative touch smoke checks                         |
| Modularity       | Headless imports and optional rendering/framework/AI code                     | Independent consumer builds and bundle inspection                        |
| Performance      | Responsive interaction on representative devices                              | Recorded input-to-render, record-navigation and multi-board measurements |
| Recoverability   | Invalid actions/imports preserve state; analysis failure is isolated          | Targeted rejection, import failure and late-result cases                 |
| Maintainability  | Explicit boundaries and documented public contracts                           | Examples and source-of-truth review with each API change                 |
| Privacy          | Local workflows need no account or data upload                                | Verify no implicit network calls or default telemetry                    |
| Portability      | Explicitly tested browser/server versions                                     | Consumer smoke checks in the declared runtime matrix                     |

Numerical latency, memory and bundle targets remain UNDECIDED until the initial
implementation establishes a baseline. See the
[performance budget](../engineering/03-performance-budget.md) and
[testing standard](../engineering/05-testing-standard.md).

SVG is the starting design choice, not a claim that it is fastest for every workload.
Keep the rendering contract independent so a measured need can justify Canvas later.
