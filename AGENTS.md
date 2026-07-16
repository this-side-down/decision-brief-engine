# Agent instructions

## Windows Git sandbox permission failures

On Windows, a `Permission denied` error while Git attempts to write under `.git` may be caused by the Codex sandbox.

When this occurs:
1. Request approval to rerun the exact `git` or `gh` command outside the sandbox.
2. Retry once after approval.
3. Do not classify the initial sandbox denial as a repository blocker.
4. Stop only if the approved retry also fails.
5. Never delete `index.lock` without first checking for an active Git process.
