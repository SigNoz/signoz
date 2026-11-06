---
paths:
  - "frontend/src/**/*.ts"
  - "frontend/src/**/*.tsx"
---

# Log body

`ILog.body` is `string | ILogBody`. On `use_json_body` tenants the API sends an object, and the collector wraps a plain-string body into `{ message }`. Every read goes through `frontend/src/lib/logs/logBody.ts`.

- **Read with a getter, never directly.** `getBodyDisplay` for a list cell or a log line, `getBodyMessage` for the drawer header. Both accept `undefined` and collapse a `{message}`-only object to its message.
- **Never cast or stringify a body inline.** No `as string`, no `String(log.body)`, no `JSON.stringify(log.body)`, no `typeof body === 'string' ? … : …` outside the module. The v5 converter collapses `{ message }` once with `extractOnlyMessageBody`; live logs and the dashboard list panel skip the converter, so their rows carry the raw object and only a getter renders them right.
- **Resolve a selected field with `getLogFieldValue`** from `lib/logs/flatLogData.ts`, so a `body.<key>` column works on both string and object bodies. An object value renders as JSON and is not offered as an add-to-query filter.
- **The drawer tree and field lookup are the only places that use the raw value.** Everything else renders a string from a getter.
- **Review check.** A raw body value used outside a getter call, `extractOnlyMessageBody` in the converter, `flatLogData.ts` and `LogDetailedView/utils.tsx` is a finding.
