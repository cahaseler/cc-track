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
