# Engineering Standards

## Fundamental Rule

Optimize for maintainability and behavior, not line count alone. The smallest implementation is not necessarily the best implementation.

## Code Quality

- Prefer explicit, readable code and descriptive identifiers.
- Eliminate duplicated business logic and unnecessary state.
- Keep functions focused and modules cohesive.
- Prefer native language capabilities where they are a clear fit.
- Avoid excessive nesting, clever implementations, and abstractions without practical value.

## Refactoring

- Preserve intended behavior unless a removal is justified and within scope.
- Inspect consumers and execution paths before removing code.
- Consider dynamic imports, reflection, runtime registration, plugins, configuration references, and public APIs.
- Keep changes focused; do not mix unrelated cleanup into a refactoring task.

## Dependencies

- Verify actual usage before removing a dependency.
- Consider native alternatives, reliability, licensing, security, compatibility, and maintenance.
- Update manifests, lockfiles, build configuration, and documentation together when dependency changes require it.
- Do not reimplement complex, reliable functionality merely to reduce dependency count.

## Security

- Never weaken security controls to reduce code size.
- Protect credentials and sensitive configuration; never commit secrets.
- Review security and compatibility implications of dependency changes.

## Tests

- Tests must validate real behavior.
- Investigate failures and distinguish pre-existing failures from regressions.
- Never delete or weaken a test simply because it fails after a change.
- Report checks that were not run and why.

## Documentation

- Use clear American English (en-US) for developer-facing documentation when language standardization is in scope.
- Keep instructions synchronized with the implementation.
- Prefer concise, practical examples over repeated theory.
- Preserve protocol-defined values, compatibility-sensitive data, and intentional product localization.

## Git

- Preserve unrelated user changes.
- Use descriptive commits and review changes before committing.
- Do not rewrite history or force-push.
- Publish only when the user requested or explicitly authorized remote delivery.
- Verify remote results before reporting a successful push or pull request.

## Completion

A task is complete only after implementation and relevant validation have succeeded. Be explicit about remaining work and limitations.
