# 会话模式

[English](./README_en.md)

DeepSeek Harness 的自定义预设。它只发送当前对话，不附加 Harness 系统提示词、自动上下文或工具，不改变默认模式。

## 技术栈

这是 **DeepSeek Harness 的 Cordis 宿主插件**，不是独立应用，也没有客户端插件。运行代码使用原生 JavaScript（ES Modules），用 YAML 声明 Agent 预设，复用 Harness 自带的模式选择界面。不需要编译、打包器、第三方项目依赖或安装脚本。

| 文件 | 用途 |
| --- | --- |
| [package.json](./package.json) | 声明包名、版本、DSH 兼容范围、模块导出和打包清单。`dsh.bundle.patch` 指定 DSH 加载入口。 |
| [cordis.patch.yml](./cordis.patch.yml) | 注册宿主插件和 `chat` 预设；该预设使用空的系统提示词。 |
| [index.js](./index.js) | 校验模型请求只含对话，拦截模型返回的工具调用和辅助模型请求。 |
| [policy.js](./policy.js) | 屏蔽该预设的工具和自动上下文，不影响其他预设。 |
| [test.cjs](./test.cjs) | 离线集成测试：通过模拟响应检查多轮历史、请求体和工具拦截，不调用线上模型，不随安装包分发。 |

## 环境

- **运行环境：** DSH `0.2.2-rc.5`，且宿主配置支持 Agent 预设。精确版本限制由 `engines.dsh` 声明；升级 DSH 后，先验证兼容性再调整限制。安装 `.tgz` 的用户不需要单独安装 Node.js 或 pnpm。
- **打包环境：** 已验证 Windows PowerShell 5.1、Node.js `24.21.0` 和 pnpm `11.28.5`。可使用 PATH 中的 `pnpm`，或用 DSH 提供的 Node.js 可执行文件运行配套的 `pnpm.mjs`。无需先执行 `pnpm install`。
- **测试环境：** 离线集成测试读取 `DSH_INSTALL_DIR` 和 `DSH_PROFILE_DIR`，测试目标是该配置中已安装的插件。Windows Desktop 的安装目录在 `app.asar` 内；运行测试时应使用 `DSH_NODE_EXECUTABLE` 指向的 Electron，并设置 `ELECTRON_RUN_AS_NODE=1`，而不是使用打包用的普通 Node.js。

## 打包与发布

### 生成安装包

1. 发布新版本前，更新 `package.json` 的 `version`。不要用相同版本号分发不同内容。
2. 在工作区根目录执行：

   ```powershell
   cd dsh-chat-mode
   pnpm pack --dry-run
   pnpm pack --pack-destination ..
   ```

   如果 PATH 中没有 `pnpm`，将两条命令开头的 `pnpm` 替换为 `& $node $pnpmScript`；将 `$node` 和 `$pnpmScript` 分别设为本机 Node.js 可执行文件和 `pnpm.mjs` 的绝对路径。
3. 安装包输出到工作区根目录，名称为 `local-dsh-chat-mode-<version>.tgz`。可在工作区根目录用 `tar -tzf .\local-dsh-chat-mode-1.0.0.tgz` 核对内容（将 `1.0.0` 替换为实际版本）。应包含清单、补丁、运行代码、中英文文案、图标和两份 README，不包含测试脚本。

### 分发与安装

当前项目采用 **直接分发 `.tgz`** 的方式，不需要 npm 账号或注册表。在目标配置的「插件 → 添加插件」中填入 `.tgz` 的绝对路径并启用。开发时也可安装插件目录；给其他人分发时，使用独立的 `.tgz`。安装后，新建会话，在发送第一条消息前从预设下拉菜单选择「会话模式」。

连接同一宿主的客户端不必重复安装。不同的宿主配置需要分别安装；重新打开已有的会话模式对话时，需要保留该预设。

`package.json` 中的 `private: true` 阻止向注册表发布，但不影响打包和分发。如果将来改为注册表发布，需要先确认包名、作用域权限和发布范围，更新清单和补丁中使用的包名（若改名），并在单独验证和授权后才执行 `pnpm publish`。
