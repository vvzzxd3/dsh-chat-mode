# Conversation mode

[简体中文](./README.md)

Conversation mode is a custom preset for DeepSeek Harness (DSH). It sends only the current conversation to the model, without a Harness system prompt, automatically injected context, or model tools. It does not change the default preset.

## Technology stack

This is a **Cordis host plugin for DeepSeek Harness**, not a standalone app or a client plugin. It uses plain JavaScript (ES modules) at runtime and YAML to declare the Agent preset. It reuses the built-in Harness preset picker. No compilation, bundler, third-party project dependencies, or install scripts are required.

| File | Purpose |
| --- | --- |
| [package.json](./package.json) | Declares the package name, version, DSH compatibility, module exports, and package contents. `dsh.bundle.patch` identifies the patch for DSH to load. |
| [cordis.patch.yml](./cordis.patch.yml) | Registers the host plugin and the `chat` preset, which uses an empty system prompt. |
| [index.js](./index.js) | Checks that model requests contain only conversation messages and blocks unexpected tool calls and auxiliary model requests. |
| [policy.js](./policy.js) | Disables tools and automatically injected context for this preset without affecting other presets. |
| `test.cjs` (local only) | Uses mocked responses to verify multi-turn history, request payloads, and tool-call blocking without contacting a live model. It is excluded from Git and from the installer. |

## Environment

- **Runtime:** DSH `0.2.2-rc.5` with a host profile that supports Agent presets. The exact version requirement is declared in `engines.dsh`. Verify compatibility before changing it for a newer DSH release. Users installing the `.tgz` do not need a separate Node.js or pnpm installation.
- **Packaging:** Verified with Windows PowerShell 5.1, Node.js `24.21.0`, and pnpm `11.28.5`. Use `pnpm` on your PATH, or use the Node.js executable provided by DSH to run its bundled `pnpm.mjs`. No `pnpm install` step is needed.
- **Testing:** The local offline integration test reads `DSH_INSTALL_DIR` and `DSH_PROFILE_DIR` and tests the plugin installed in that profile. On Windows Desktop, the installation is inside `app.asar`. Run the test with the Electron executable identified by `DSH_NODE_EXECUTABLE` and set `ELECTRON_RUN_AS_NODE=1`; do not use the standalone Node.js executable used for packaging.

## Packaging and release

### Build the installer

1. Before releasing, update `version` in [package.json](./package.json). Do not distribute different contents under the same version number.
2. From the `dsh-chat-mode` project directory, run:

   ```powershell
   pnpm pack --dry-run
   pnpm pack --pack-destination ..
   ```

   If `pnpm` is not on your PATH, replace `pnpm` at the start of each command with `& $node $pnpmScript`, where `$node` and `$pnpmScript` are the absolute paths to the Node.js executable and `pnpm.mjs`.
3. The archive is written to the parent directory as `local-dsh-chat-mode-<version>.tgz`. To check its contents, run the command below from the project directory, replacing `1.0.0` with the actual version:

   ```powershell
   tar -tzf ..\local-dsh-chat-mode-1.0.0.tgz
   ```

   The archive should contain the manifest, patch, runtime code, English and Chinese locale resources, icon, and both README files. It should not contain the local test script.

### Distribute and install

Distribute the **`.tgz` file directly**. No npm account or registry is needed. In the target DSH profile, open **Plugins → Add plugin**, enter the absolute path to the archive, and enable the plugin. For local development, you can install the plugin directory instead.

Start a new session and select **会话模式** (Conversation mode) from the preset picker before sending the first message. That is the label shown in the picker by this version.

Clients connected to the same DSH host and profile do not need separate installations. Install the bundle separately in each independent profile, and keep it installed to reopen existing Conversation mode sessions.

The package is marked `private: true`, which prevents registry publishing but does not prevent packaging or direct distribution. If you later choose to publish to a registry, confirm the package name, scope permissions, and visibility first. If the package is renamed, update the references in the manifest and patch. Run `pnpm publish` only after separate verification and authorization.
