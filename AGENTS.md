# Agent instructions

## Pre-push typecheck

For TypeScript changes, use the Node version configured in [CI](.github/workflows/ci.yml). Run `npm ci` in a fresh checkout, then run `npm run typecheck` before handing off the change. If the check cannot start, report the missing prerequisite before editing source. For a source failure, capture the first actionable diagnostic and rerun the check after the repair.

Record the tested revision or patch, exit code, and a sanitized diagnostic in the handoff. Treat the local result as advisory. A base change can invalidate an earlier pass, so use the required PR check on the current merge inputs. See [the DBE experiment](https://github.com/this-side-down/decision-brief-engine/issues/190).

## Windows Git sandbox permission failures

On Windows, a `Permission denied` error while Git attempts to write under `.git` may be caused by the Codex sandbox.

When this occurs:
1. Request approval to rerun the exact `git` or `gh` command outside the sandbox.
2. Retry once after approval.
3. Do not classify the initial sandbox denial as a repository blocker.
4. Stop only if the approved retry also fails.
5. Never delete `index.lock` without first checking for an active Git process.
