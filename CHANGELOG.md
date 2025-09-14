# [1.14.0](https://github.com/cahaseler/cc-track/compare/v1.13.0...v1.14.0) (2025-09-14)


### Bug Fixes

* configure settings.json with Edit tool in setup command ([9286810](https://github.com/cahaseler/cc-track/commit/928681071fe50a96a80f634e14e4baa3e53d7210))
* correct hooks configuration structure in setup instructions ([a08f1d3](https://github.com/cahaseler/cc-track/commit/a08f1d3060fbfc213e241268eb391a3be73b43e4))
* correct instruction text for Claude Code startup ([787d8d7](https://github.com/cahaseler/cc-track/commit/787d8d783b3913f601840d2f4431c16c321e3178))
* remove learned_mistakes.md from npm package resources ([4ab5e68](https://github.com/cahaseler/cc-track/commit/4ab5e6852a2da10b7675ba99db00cacaea468227))
* update embed-resources to read from src/commands/slash-commands ([9c2ab96](https://github.com/cahaseler/cc-track/commit/9c2ab96efb02491a2eec6195e715eb8c5d757928))
* update model identifier to claude-sonnet-4-20250514 ([fb57b96](https://github.com/cahaseler/cc-track/commit/fb57b96442db057a085c94119b034c0f56a0b76b))
* update test calls to include hasPrivateJournal parameter ([2c25542](https://github.com/cahaseler/cc-track/commit/2c255423f1cc0c903bda345a07dc134a4d1c41e5))


### Features

* add complete CLAUDE.md configuration with @ imports to setup ([1038aa4](https://github.com/cahaseler/cc-track/commit/1038aa4ae30bb71037d5f5ecfafb14cb3be442aa))
* add optional private journal MCP configuration and conditional integration ([775f0ea](https://github.com/cahaseler/cc-track/commit/775f0ea625849037d980f56c34066b9427e556cd))
* add pre-push hooks suggestion for stop-review workflow ([e68c90f](https://github.com/cahaseler/cc-track/commit/e68c90fa1b3488c23a608e932c41557fbeb840d5))
* configure npm package for global installation with compiled binary ([4cfa982](https://github.com/cahaseler/cc-track/commit/4cfa98200fa2b4bc6baf27196fd5cd447599fa93))
* enable private journal MCP integration in cc-track config ([8064b80](https://github.com/cahaseler/cc-track/commit/8064b80f0294aa3749938741b8981f1784f08589))
* implement build-time resource embedding for npm package ([3d69cad](https://github.com/cahaseler/cc-track/commit/3d69cad8e8b8456c3a56d60697f36b5b01cbe297))
* restrict setup command to specific safe operations ([2d964d3](https://github.com/cahaseler/cc-track/commit/2d964d3aba5debdaf99507f314b859978dab67d9))

# [1.13.0](https://github.com/cahaseler/cc-track/compare/v1.12.0...v1.13.0) (2025-09-14)


### Bug Fixes

* address Copilot review feedback on cross-platform support ([d79f82a](https://github.com/cahaseler/cc-track/commit/d79f82ac8d5c740b124f3290cfaf5ef658f24c7f))


### Features

* implement cross-platform installation support ([dbdec6b](https://github.com/cahaseler/cc-track/commit/dbdec6b4c56c17c0d329b528d9bcfd64d577b628))
* make cc-track cross-platform compatible ([c8d6c9c](https://github.com/cahaseler/cc-track/commit/c8d6c9ccc1cc3a48f29cd637ba73dff2a1aa437a))
* remove init command and fix cross-platform paths for TASK_047 ([b2c4e12](https://github.com/cahaseler/cc-track/commit/b2c4e124f9af6bf4fa8c1f94ba157d582c1b2841))

# [1.12.0](https://github.com/cahaseler/cc-track/compare/v1.11.0...v1.12.0) (2025-09-14)


### Features

* inject build version using semantic-release environment variables ([5837306](https://github.com/cahaseler/cc-track/commit/583730665a4eab64f052e70191649703fb1e92a5))

# [1.11.0](https://github.com/cahaseler/cc-track/compare/v1.10.0...v1.11.0) (2025-09-14)


### Features

* replace error pattern extraction with task progress updates in pre-compact hook ([4a619b6](https://github.com/cahaseler/cc-track/commit/4a619b6f795f80af6ae6aefbbd1c8ea1d4abb8b0))
* replace error patterns with task progress updates in pre-compact hook ([2257084](https://github.com/cahaseler/cc-track/commit/2257084154b70567a86da65adf8e84ef1f48da21))

# [1.10.0](https://github.com/cahaseler/cc-track/compare/v1.9.0...v1.10.0) (2025-09-13)


### Bug Fixes

* handle markdown code blocks in task validation response parsing ([1672fc4](https://github.com/cahaseler/cc-track/commit/1672fc400588c044d4489b69f7615b634a8f788f))


### Features

* add PreToolUse hook for task file edit validation ([a7de30e](https://github.com/cahaseler/cc-track/commit/a7de30e91c686c9fc0ae469476bb5ab4a874886f))
* implement PreToolUse task validation hook with Claude SDK ([c6374d0](https://github.com/cahaseler/cc-track/commit/c6374d0b08b2d04f1f6fd8ef87fe1d14a88d7c61))
* improve task validation prompt clarity ([b672b96](https://github.com/cahaseler/cc-track/commit/b672b968852c74b2ce8c56cfe5c24cb94d8120b7))

# [1.9.0](https://github.com/cahaseler/cc-track/compare/v1.8.0...v1.9.0) (2025-09-13)


### Features

* TASK_043 integrate DiffSummary compression into stop-review hook ([6716baf](https://github.com/cahaseler/cc-track/commit/6716bafb08c7711bb20ceeeda3594f63d8e7d59f))

# [1.8.0](https://github.com/cahaseler/cc-track/compare/v1.7.0...v1.8.0) (2025-09-13)


### Features

* add git diff summary utility with Claude SDK integration ([721204a](https://github.com/cahaseler/cc-track/commit/721204a9471c462c60377800a258791d4b3f2760))
* implement git diff summary utility with Claude SDK integration ([a38dbdb](https://github.com/cahaseler/cc-track/commit/a38dbdbf1845532107720f73c2815e1a63e8791d))

# [1.7.0](https://github.com/cahaseler/cc-track/compare/v1.6.0...v1.7.0) (2025-09-13)


### Bug Fixes

* **claude-sdk:** simplify stream termination by removing AbortController ([a5349c3](https://github.com/cahaseler/cc-track/commit/a5349c34c777afa29766b415b090848df98eed46))
* **hooks:** add fallback branching for issue branch creation failure ([0c8d725](https://github.com/cahaseler/cc-track/commit/0c8d725801de3254fc4d0fd5445c144103459702))
* merge stop-review improvements with validation ([336c1e3](https://github.com/cahaseler/cc-track/commit/336c1e374555dd8363871bbd89bb10cd9e58b6d1))
* resolve linting issues and improve pre-push hook ([4b6c791](https://github.com/cahaseler/cc-track/commit/4b6c791a46f34e53d58540e185840baf19077c63))


### Features

* add object manipulation, async function example, and expanded console logging in test file ([43924bb](https://github.com/cahaseler/cc-track/commit/43924bb2bea621233b7fda649e31e5f72916af22))

# [1.6.0](https://github.com/cahaseler/cc-track/compare/v1.5.0...v1.6.0) (2025-09-12)


### Bug Fixes

* handle max_turns error with valid response in Claude SDK ([0192205](https://github.com/cahaseler/cc-track/commit/01922050a358bfa14382407cc12f340f8b02ee52))
* update model names to use generic versions instead of hardcoded ones ([ca7f503](https://github.com/cahaseler/cc-track/commit/ca7f503e1e8696d20dde6f228fcd40fd892f85c5))


### Features

* 039 implement Claude SDK wrapper and migrate GitHelpers ([c3bd3ba](https://github.com/cahaseler/cc-track/commit/c3bd3ba2e3ec92299f90310e8c6d4365e632dce7))
* add advanced SDK test with commit message and code review capabilities ([193d1d9](https://github.com/cahaseler/cc-track/commit/193d1d96f62346966846c9ca2615dc56049236bf))
* add Claude Code SDK dependency and test script ([3d92d69](https://github.com/cahaseler/cc-track/commit/3d92d69468d8eed32f2c5206defde182b597fef7))
* complete Claude SDK integration with test mocking ([9c27f43](https://github.com/cahaseler/cc-track/commit/9c27f432599ee15e80630139a0be03efc2152090))
* complete migration from Claude CLI to TypeScript SDK ([58e8383](https://github.com/cahaseler/cc-track/commit/58e83830126c293e7c8a5ba134fb725b5a5281a6))
* migrate pre-compact hook to Claude SDK with proper mocking ([2197b1c](https://github.com/cahaseler/cc-track/commit/2197b1c95198cbf7bee88b2f750fbcd1b38a9d07))

# [1.5.0](https://github.com/cahaseler/cc-track/compare/v1.4.2...v1.5.0) (2025-09-12)


### Features

* remove unused standalone function exports from helper libraries ([2a89af3](https://github.com/cahaseler/cc-track/commit/2a89af3cff056b38e6d912b548087a20b728a3b8))
* remove unused standalone function exports from helper modules ([f80d78b](https://github.com/cahaseler/cc-track/commit/f80d78bd79e6d84132250e1f4bbff75bd2c36870))

## [1.4.2](https://github.com/cahaseler/cc-track/compare/v1.4.1...v1.4.2) (2025-09-12)


### Bug Fixes

* TASK_037 fix GitHub issue branch linking logic ([e4383f3](https://github.com/cahaseler/cc-track/commit/e4383f38cdb1a2b0ffdb0c0a5ffb275e6d0c9ab9))

## [1.4.1](https://github.com/cahaseler/cc-track/compare/v1.4.0...v1.4.1) (2025-09-12)


### Bug Fixes

* make prepare-completion always exit with code 0 for Claude feedback ([14bd2ea](https://github.com/cahaseler/cc-track/commit/14bd2eabda486350612b25c0a986ca4b78d0c749))

# [1.4.0](https://github.com/cahaseler/cc-track/compare/v1.3.0...v1.4.0) (2025-09-12)


### Bug Fixes

* implement conventional commit message generation ([7ef52dc](https://github.com/cahaseler/cc-track/commit/7ef52dca2768a5e69e4330299fec2d8036661180))
* implement project-wide TypeScript validation with file filtering ([11f3347](https://github.com/cahaseler/cc-track/commit/11f334733219c6d0833a1834a09c20e3ec3b25d7))
* resolve linting issues in edit-validation tests ([a83e772](https://github.com/cahaseler/cc-track/commit/a83e7728c2f4568d518cc6ece8ddedc9989d730b))


### Features

* implement project-wide typescript validation hook ([47be831](https://github.com/cahaseler/cc-track/commit/47be831dc03cc313c8857500443b13611b8a056b))
* implement project-wide TypeScript validation with file filtering ([e066da2](https://github.com/cahaseler/cc-track/commit/e066da23ebb60a056f90d4322c542e2c945ca3a1))

# [1.3.0](https://github.com/cahaseler/cc-track/compare/v1.2.1...v1.3.0) (2025-09-12)


### Bug Fixes

* address Biome linting issues ([fca2bae](https://github.com/cahaseler/cc-track/commit/fca2baee36cd21c1b8acbc375026d25d2f6fc372))
* escape backticks in GitHub issue content to prevent shell interpretation ([fffe0df](https://github.com/cahaseler/cc-track/commit/fffe0df3eb90bd7712619f7b4a37d5532ff676c4))
* handle bun dependency messages in prepare-completion validation output ([8a4e075](https://github.com/cahaseler/cc-track/commit/8a4e075c7c7576dc4f3733748db2565b90af3b37))
* improve complete-task error handling with early exits ([d3f55b3](https://github.com/cahaseler/cc-track/commit/d3f55b3a88018da35a293758931aa548325d5f28))
* resolve GitHub issue creation validation and shell escaping ([c6b8d2d](https://github.com/cahaseler/cc-track/commit/c6b8d2dc133fe581423efbe35e74dcb37dc18630))
* resolve minor type inconsistencies in codebase ([f63ef70](https://github.com/cahaseler/cc-track/commit/f63ef70992ef9e19b97cc5ed443db8e5b86ccf21))


### Features

* make log directory configurable and move outside project ([cf033f2](https://github.com/cahaseler/cc-track/commit/cf033f2312372c269a080f21813ec15f73a5fec0))

## [1.2.1](https://github.com/cahaseler/cc-track/compare/v1.2.0...v1.2.1) (2025-09-12)


### Bug Fixes

* conventional commit message generation for code changes ([459987f](https://github.com/cahaseler/cc-track/commit/459987fc9bcb468dde7742156b96ca3660b5584f))
* reduce token consumption in post-compaction context file handling ([6bf697e](https://github.com/cahaseler/cc-track/commit/6bf697e61d3359b19a1b6ffceea0be63f1bcb311))

# [1.2.0](https://github.com/cahaseler/cc-track/compare/v1.1.0...v1.2.0) (2025-09-12)


### Bug Fixes

* TASK_030 use type import for ClaudeMdHelpers in test ([b15421a](https://github.com/cahaseler/cc-track/commit/b15421a544d8b3115aa34297d074fa442903af3f))


### Features

* improve hooks for better developer experience - filter private journal files from stop-review and verify test file skipping ([c5480b6](https://github.com/cahaseler/cc-track/commit/c5480b6cd02aa8d19e328dd192549dfbf50ab5b2))
* TASK_030 improve hooks for better developer experience ([77e87f5](https://github.com/cahaseler/cc-track/commit/77e87f594ec23099518700bcf18735497eaf0d9c))

# [1.1.0](https://github.com/cahaseler/cc-track/compare/v1.0.0...v1.1.0) (2025-09-12)


### Bug Fixes

* resolve ClaudeMdHelpers import in stop-review tests ([f1f71c4](https://github.com/cahaseler/cc-track/commit/f1f71c43707584a71a9226161be47ef966a21536))
* standardize commit message format ([04d5553](https://github.com/cahaseler/cc-track/commit/04d555328d5cefd293de3f03f5b2d4e1bdb26841))


### Features

* consolidate duplicate helper functions across codebase ([a97e1f0](https://github.com/cahaseler/cc-track/commit/a97e1f02c6285709dcae05b353c5fdb6d2aa2cfa))
* consolidate duplicate helper functions across codebase ([23bb0ca](https://github.com/cahaseler/cc-track/commit/23bb0ca3469e12cd916e039099f4d28c158e52d9))


### Reverts

* remove unrelated embedding file from consolidation task ([8c3b657](https://github.com/cahaseler/cc-track/commit/8c3b65770e827ebed5fb871630cb8ca246269a2d))

# 1.0.0 (2025-09-11)


### Bug Fixes

* add missing readFileSync mock in stop-review tests ([3ff7504](https://github.com/cahaseler/cc-track/commit/3ff7504a40873ff2827e59e884e09d3c8d6c0e36))
* correct config key path for git_branching feature check ([3ef7341](https://github.com/cahaseler/cc-track/commit/3ef7341dc3b3cfdf2d79e3bbcbe0c5784d3ba4cf))
* format GitHub helpers to resolve linting issues ([b554d01](https://github.com/cahaseler/cc-track/commit/b554d01e40786a3050935d3cb1eb35a8c6d14fe1))
* resolve Biome linting error in complete-task script ([d429e09](https://github.com/cahaseler/cc-track/commit/d429e09c8c35e9043468189ed10b9031c8104381))
* resolve plan capture hook approval detection logic ([e0c82d3](https://github.com/cahaseler/cc-track/commit/e0c82d3fdd58e97a1abd14a1fcf9c2fcb04d9a91))
* Update no_active_task.md with completed tasks list ([88a4d9e](https://github.com/cahaseler/cc-track/commit/88a4d9eb439b4d41b5db00fe7fab16ba1888bbb9))
* update statusline task display text ([71eff20](https://github.com/cahaseler/cc-track/commit/71eff20b529799248f6dcaa05236c2186d1f4f91))


### Features

* Consolidate hook files to single location ([cb34bf6](https://github.com/cahaseler/cc-track/commit/cb34bf6998259f938c734d62c5a4023bd085da2b))
* enable git branching feature ([a7bac1a](https://github.com/cahaseler/cc-track/commit/a7bac1aa715b25113de197949d3426ed58f13aa7))
* **hooks:** Add PostToolUse edit validation hook for TypeScript and Biome ([e4a7084](https://github.com/cahaseler/cc-track/commit/e4a70844505bacb98f3d1d2997cb062405f2a894))
* implement GitHub integration infrastructure ([f1aedbe](https://github.com/cahaseler/cc-track/commit/f1aedbe56276afa0ab236c7c54d6f2db30aacf99))
* TASK_027 add task ID to commit messages ([0cd70e4](https://github.com/cahaseler/cc-track/commit/0cd70e4e811172abd8b8743cd371434ad0ff5f09))
* TASK_027 complete semantic release with cross-platform distribution ([f47388a](https://github.com/cahaseler/cc-track/commit/f47388add6473d5bafad9cf2ff628d8f90d6e826))
