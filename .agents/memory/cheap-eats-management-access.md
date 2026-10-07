---
name: Cheap Eats management access
description: User-approved boundary between bot management commands and member-facing order/support features.
---

Server administrators always retain management access. Only administrators and individually approved users may run bot management commands, including `/setup`, `/status`, `/restaurant`, `/menu`, and the individual `/set-*` configuration commands; only administrators can grant, revoke, or list approvals. Order and support panels remain available to server members, and staff roles continue to govern ticket actions.

**Why:** The user chose to restrict management commands without blocking customers from ordering or requesting support.

**How to apply:** Keep new management commands behind the access list, preserve the administrator bypass, and leave customer-facing order/support flows available unless the user changes this policy.
