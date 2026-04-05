# Turbo TSC Reviewer 🛡️ 🚀

**Turbo TSC Reviewer** is a specialized GitHub Action designed for **modern monorepos**. It provides native, "at-source" PR Review comments for **TypeScript (TSC)** errors without the complex path-mapping hacks required by legacy tools.

> [!IMPORTANT]
> This action requires **Turborepo 2.9.3+** and utilizes the experimental `--json` structured logging format for reliable path resolution.

### 🌟 Why use this?

Most PR Review tools struggle with monorepo directory structures. **Turbo TSC Reviewer** natively resolves your repository's workspace graph:

- ✅ **Monorepo-Native Path Resolution**: Automatically maps TSC errors to the correct workspace folder (apps/ packages/ etc.).
- ✅ **One-Run Execution**: Executes your `check-types` tasks exactly once, saving time and CI costs. ⚡️
- ✅ **Conversational PR Reviews**: Posts professional inline comments directly to your PR conversation.
- ✅ **Zero-Hack Architecture**: Built with native Node.js JSON parsing. No `sed`, `grep`, or regex hacks.

---

### 🚀 Quick Start

To begin using **Turbo TSC Reviewer** in your repository, simply add it to your CI workflow:

```yaml
jobs:
  code-quality:
    name: Code Quality Review
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci

      # 🌪️ Turbo TSC Reviewer
      - name: Run Turbo TSC Reviewer
        uses: labs/turbo-tsc-reviewer@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

---

### 🛡️ How it Works

**Turbo TSC Reviewer** uses a high-performance, project-native approach:

1. **Lazy Workspace Discovery**: Dynamically resolves your target package's directory using `npm ls` only when a TSC error is identified.
2. **Experimental JSON Analysis**: Parses the **`turbo --json`** structured output from your TypeScript tasks for absolute data accuracy.
3. **Conversational Feedback**: Groups all errors into a single, high-quality **Pull Request Review**.

---

### ⚙️ Inputs

| Input          | Description                                     | Required |
| -------------- | ----------------------------------------------- | -------- |
| `github_token` | The `GITHUB_TOKEN` for posting review comments. | **Yes**  |

---

### 📄 License

This project is licensed under the **MIT License**. Created with ❤️ by **Vinayaka Hebbar**.

🚀 **Join the next-gen of Monorepo Quality Gates!** 🛡️
