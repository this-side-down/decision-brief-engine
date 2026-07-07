# Repository Maintenance

## CI

GitHub Actions runs on pull requests and pushes to `main`.

The required CI check is `CI / typecheck-and-build`, or `typecheck-and-build` if GitHub displays the shorter name.

CI runs typecheck and build only:

- `npm run typecheck`
- `npm run build`

This repo intentionally does not include deployment automation beyond the existing Vercel integration.

## Branch ruleset

Path:

Repo -> Settings -> Rules -> Rulesets -> New ruleset -> New branch ruleset

Ruleset:

- Name: `main-protection`
- Enforcement: Active
- Bypass list: None
- Target branches: Include default branch

Enable:

- Restrict deletions
- Require a pull request before merging
- Require status checks to pass
- Block force pushes

Pull request settings:

- Required approvals: 0
- Require review from Code Owners: off
- Dismiss stale pull request approvals: off
- Require approval of most recent reviewable push: off
- Require conversation resolution before merging: on, if available

Status check settings:

- Require branches to be up to date before merging: on
- Required status check: `CI / typecheck-and-build`

Do not enable:

- Require signed commits
- Require deployments
- Restrict creations
- Restrict updates
- Commit metadata restrictions
- Tag rules
- Push ruleset

## Recommended repository settings

Settings -> General -> Pull Requests:

- Allow squash merging: on
- Allow merge commits: off
- Allow rebase merging: off
- Automatically delete head branches: on
- Always suggest updating pull request branches: on, if available
- Allow auto-merge: optional

Settings -> Actions -> General:

- Actions permissions: allow GitHub-created actions and verified creators
- Workflow permissions: read repository contents and packages
- Do not allow GitHub Actions to create and approve pull requests

Settings -> Code security and analysis:

- Dependency graph: on
- Dependabot alerts: on
- Dependabot security updates: on
- Secret scanning: on
- Push protection: on, if available

Settings -> General -> Repository details:

- Description: Mocked AI-native decision brief demo with a visible Capture Layer.
- Website: https://decision-brief-engine.vercel.app/
- Topics: `ai`, `product-management`, `decision-support`, `vite`, `react`, `typescript`
