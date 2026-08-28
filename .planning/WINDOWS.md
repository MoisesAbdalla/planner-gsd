---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 1
total_count: 2
last_updated: 2026-08-28T18:12:31.559Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | stub | src/app/routes/categorias.tsx |  | Stub navegável, título só — o plano 01-06 substitui pela tela real de lista de categorias | fixed |  | 2026-08-28T13:33:25.263Z | 2026-08-28T18:12:31.559Z |
| 2 | 01 | stub | src/app/routes/convidar.tsx |  | Stub navegável, título só — o plano 01-05 substitui pela tela real de convite | open |  | 2026-08-28T13:33:25.592Z |  |

````json
[
  {
    "id": 1,
    "kind": "stub",
    "phase": "01",
    "file": "src/app/routes/categorias.tsx",
    "line": null,
    "description": "Stub navegável, título só — o plano 01-06 substitui pela tela real de lista de categorias",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-28T13:33:25.263Z",
    "resolved_at": "2026-08-28T18:12:31.559Z"
  },
  {
    "id": 2,
    "kind": "stub",
    "phase": "01",
    "file": "src/app/routes/convidar.tsx",
    "line": null,
    "description": "Stub navegável, título só — o plano 01-05 substitui pela tela real de convite",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-28T13:33:25.592Z",
    "resolved_at": null
  }
]
````
