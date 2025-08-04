# Testing

## End-to-End (E2E) Tests with Maestro

### Prerequisites

#### Install Maestro CLI

```bash
# Install Maestro CLI
curl -Ls "https://get.maestro.mobile.dev" | bash

# Add to PATH (add to your shell profile)
export PATH="$PATH":"$HOME/.maestro/bin"

# Add to shell profile to persist across sessions
# For bash users:
echo 'export PATH="$PATH":"$HOME/.maestro/bin"' >> ~/.bashrc

# For zsh users:
echo 'export PATH="$PATH":"$HOME/.maestro/bin"' >> ~/.zshrc

# Reload your shell or restart terminal
source ~/.bashrc  # or ~/.zshrc

# Verify installation
maestro --version
```

#### Setup Development Environment

**For Android:**

- Android SDK installed
- Android device/emulator running
- App installed on device: `npm run mobile:android`

**For iOS:**

- Xcode installed (macOS only)
- iOS Simulator running
- App installed: `npm run mobile:ios`

### Running E2E Tests

#### Quick Commands (Recommended)

```bash
# Quick smoke tests (~2 minutes)
npm run e2e:smoke

# Core functionality tests (~10 minutes)
npm run e2e:core

# Full test suite (~20 minutes)
npm run e2e:all

# Generate detailed reports
npm run e2e:reports
```

#### Direct Maestro Commands

```bash
# Navigate to e2e directory
cd e2e

# Run specific test flow
maestro test maestro/flows/00_smoke_test_suite.yaml

# Run all tests
maestro test maestro/flows/

# Run with specific tags
maestro test --include-tags=smoke maestro/flows/
maestro test --include-tags=core maestro/flows/

# Debug mode
maestro test --debug maestro/flows/01_app_initialization.yaml
```

### Available Test Flows

1. **`00_smoke_test_suite.yaml`** - Quick validation (~2 min)
2. **`01_app_initialization.yaml`** - App startup testing (~3 min)
3. **`02_expense_crud_operations.yaml`** - Expense lifecycle (~5 min)
4. **`03_category_management.yaml`** - Category management (~4 min)
5. **`04_expense_filtering_and_search.yaml`** - Search/filtering (~4 min)
6. **`05_settings_and_preferences.yaml`** - User preferences (~3 min)
7. **`06_offline_functionality.yaml`** - Offline behavior (~4 min)

For detailed E2E testing documentation, see: `e2e/README.md`
