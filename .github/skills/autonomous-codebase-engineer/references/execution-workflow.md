# Autonomous Execution Workflow

## Phase 1: Discovery

Read repository-specific instructions and inspect the working tree before changing files. Identify the project technology, entry points, architecture, key execution paths, integrations, tests, dependencies, and documentation. Record the initial test/build state and source-size baseline using stated, repeatable counting rules.

## Phase 2: Planning

Create a small, prioritized checklist of independently verifiable tasks. Prefer high-impact redundant code, verified dead code, duplicate implementations, unnecessary complexity, unused dependencies, and obsolete configuration. Treat a 70% reduction as a target only if explicitly requested and technically responsible; never optimize deletion metrics at the expense of behavior or quality.

## Phase 3: Implementation

Work on one logical task at a time:

1. Understand the affected implementation and its consumers.
2. Identify compatibility, security, and behavior constraints.
3. Make the smallest change that achieves the justified simplification.
4. Remove obsolete code only after checking its references and runtime registration.
5. Run the narrowest relevant test or check immediately.
6. Repair regressions and rerun that check before proceeding.
7. Review the diff and update relevant documentation.
8. Commit validated work when commits are within scope and authorized.

## Phase 4: Regression Prevention

Run relevant tests after each significant change and module. Run the broader available test suite after the implementation. Investigate all newly introduced failures. Do not hide failures, weaken tests, or label an unexecuted check as passing.

## Phase 5: Documentation

When documentation work is in scope, use clear en-US for developer-facing content. Update README, installation, configuration, architecture, testing, and development instructions to match the actual implementation. Remove obsolete instructions and avoid duplicating source code in prose.

## Phase 6: Final Audit

Review remaining complexity, removals, dependency usage, security, compatibility, tests, documentation, and the complete Git diff. Compare source-size metrics against the baseline using the same exclusions and counting method. Report results honestly, including any target that was not responsible or achievable.

## Phase 7: GitHub Delivery

When remote delivery is authorized, verify the working tree, run final checks, review the complete diff, commit intended validated changes, push to the configured remote, and verify the remote branch. Create a pull request only when appropriate and supported. Never force-push. If authentication or permissions block delivery, preserve local commits and report the exact blocker.

## Phase 8: Session Continuity

If the work cannot finish in the current session, update `WORKLOG.md` with:

- Completed tasks and current task.
- Changed files and relevant decisions.
- Tests/checks run and their results.
- Known failures and unresolved risks.
- Remaining work and exact next actions.

The next session must read this checkpoint and continue from the last verified state. Do not claim work continued in the background after the session stopped.
