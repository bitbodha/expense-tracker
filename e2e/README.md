# End-to-End (E2E) Testing with Maestro

This directory contains Maestro-based end-to-end tests for the Expense Tracker React Native application.

## Overview

We use [Maestro](https://maestro.mobile.dev/) for E2E testing because it offers:
- ✅ Simple YAML-based test definition
- ✅ Cross-platform support (iOS & Android)
- ✅ Fast execution and minimal setup
- ✅ Excellent CI/CD integration
- ✅ Visual test creation with Maestro Studio

## Prerequisites

### 1. Install Maestro

```bash
# Install Maestro CLI
curl -Ls "https://get.maestro.mobile.dev" | bash

# Add to PATH (add to your shell profile)
export PATH="$PATH":"$HOME/.maestro/bin"

# Verify installation
maestro --version
```

### 2. Setup Development Environment

**For Android:**
- Android SDK installed
- Android device/emulator running
- App installed on device: `npm run android`

**For iOS:**
- Xcode installed (macOS only)
- iOS Simulator running
- App installed: `npm run ios`

## Test Structure

```
e2e/
├── maestro/
│   ├── .maestro/
│   │   └── config.yaml           # Global configuration
│   ├── flows/
│   │   ├── 00_smoke_test_suite.yaml       # Quick smoke tests
│   │   ├── 01_app_initialization.yaml     # App startup & initialization
│   │   ├── 02_expense_crud_operations.yaml # Create, read, update, delete expenses
│   │   ├── 03_category_management.yaml    # Category CRUD and management
│   │   ├── 04_expense_filtering_and_search.yaml # Search and filter functionality
│   │   ├── 05_settings_and_preferences.yaml     # Settings and user preferences
│   │   └── 06_offline_functionality.yaml  # Offline behavior testing
│   └── fixtures/
│       └── test_data.yaml        # Test data for flows
├── reports/                      # Test execution reports
└── README.md                     # This file
```

## Running Tests

### Individual Test Flows

```bash
# Navigate to the e2e directory
cd e2e

# Run a specific test flow
maestro test maestro/flows/00_smoke_test_suite.yaml

# Run app initialization tests
maestro test maestro/flows/01_app_initialization.yaml

# Run expense CRUD tests
maestro test maestro/flows/02_expense_crud_operations.yaml
```

### Run All Tests

```bash
# Run all test flows
maestro test maestro/flows/

# Run tests with specific tags
maestro test --include-tags=smoke maestro/flows/
maestro test --include-tags=core maestro/flows/
```

### Test Suites by Priority

```bash
# Critical smoke tests (runs in ~2 minutes)
maestro test --include-tags=smoke maestro/flows/

# Core functionality tests (runs in ~10 minutes)
maestro test --include-tags=core maestro/flows/

# Full regression suite (runs in ~20 minutes)
maestro test maestro/flows/
```

## Test Flows Description

### 1. Smoke Test Suite (`00_smoke_test_suite.yaml`)
**Purpose:** Quick validation of core functionality
**Duration:** ~2 minutes
**Tags:** `smoke`, `critical`, `quick`
**Tests:**
- App launches successfully
- Basic navigation works
- Can create a simple expense
- Can view expenses
- Settings are accessible

### 2. App Initialization (`01_app_initialization.yaml`)
**Purpose:** Comprehensive app startup testing
**Duration:** ~3 minutes
**Tags:** `core`, `smoke`, `initialization`
**Tests:**
- Database initialization
- Default data loading
- Navigation system
- Error handling for missing data
- Performance during startup

### 3. Expense CRUD Operations (`02_expense_crud_operations.yaml`)
**Purpose:** Complete expense lifecycle testing
**Duration:** ~5 minutes
**Tags:** `core`, `crud`, `expense`
**Tests:**
- Create expense with all fields
- Edit existing expenses
- Delete expenses with confirmation
- Form validation and error handling
- Multiple expense management

### 4. Category Management (`03_category_management.yaml`)
**Purpose:** Category system functionality
**Duration:** ~4 minutes
**Tags:** `management`, `category`, `admin`
**Tests:**
- Create, edit, delete categories
- Subcategory management
- Category validation
- Color and icon customization
- Usage statistics

### 5. Expense Filtering and Search (`04_expense_filtering_and_search.yaml`)
**Purpose:** Data discovery and filtering
**Duration:** ~4 minutes
**Tags:** `search`, `filter`, `reports`
**Tests:**
- Text search across fields
- Category filtering
- Amount range filtering
- Date range filtering
- Combined filters
- Sort options

### 6. Settings and Preferences (`05_settings_and_preferences.yaml`)
**Purpose:** User customization and preferences
**Duration:** ~3 minutes
**Tags:** `settings`, `preferences`, `configuration`
**Tests:**
- Currency settings
- Theme changes (light/dark)
- Date format preferences
- Backup and restore
- Data export functionality

### 7. Offline Functionality (`06_offline_functionality.yaml`)
**Purpose:** Offline-first app behavior
**Duration:** ~4 minutes
**Tags:** `offline`, `sync`, `reliability`
**Tests:**
- CRUD operations while offline
- Data persistence
- Settings changes offline
- App restart data integrity

## Test Data Management

### Creating Test Data

Some tests require specific data setup. Use the fixture files to maintain consistent test data:

```yaml
# maestro/fixtures/test_data.yaml
categories:
  - name: "Test Food Category"
    icon: "🍕"
    color: "#FF5722"
  - name: "Test Transport Category"
    icon: "🚗"
    color: "#2196F3"

expenses:
  - amount: 25.99
    vendor: "Test Restaurant"
    category: "Test Food Category"
```

### Data Cleanup

Tests should clean up after themselves. Each test flow includes cleanup steps to ensure a clean state for subsequent tests.

## CI/CD Integration

### GitHub Actions Setup

The E2E tests are integrated into the CI/CD pipeline:

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  e2e-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Maestro
        run: |
          curl -Ls "https://get.maestro.mobile.dev" | bash
          echo "$HOME/.maestro/bin" >> $GITHUB_PATH
      - name: Run E2E Tests
        run: |
          cd e2e
          maestro test --format junit --output reports/ maestro/flows/
```

### Test Execution Strategy

**PR Validation:**
- Smoke tests only (fast feedback)
- Run on every pull request

**Main Branch:**
- Full test suite
- Run on merge to main

**Nightly:**
- Full regression suite
- Performance testing
- Cross-device testing

## Debugging Tests

### Using Maestro Studio

Maestro Studio provides a visual interface for test creation and debugging:

```bash
# Launch Maestro Studio
maestro studio

# Record interactions to create tests
maestro record

# Debug a specific test
maestro test --debug maestro/flows/02_expense_crud_operations.yaml
```

### Common Issues and Solutions

**App Not Found:**
```bash
# Check app is installed
adb shell pm list packages | grep com.expensetracker

# Reinstall app
npm run android
```

**Element Not Found:**
- Use `maestro studio` to inspect element IDs
- Add explicit waits: `waitForAnimationToEnd`
- Check element text matches exactly

**Test Flakiness:**
- Add appropriate timeouts
- Use `waitForAnimationToEnd` after navigation
- Ensure proper test data cleanup

**Performance Issues:**
- Run tests on release builds: `npm run android:release`
- Use device with sufficient resources
- Close other apps during testing

## Test Reporting

### Reports Generation

```bash
# Generate HTML report
maestro test --format html --output reports/ maestro/flows/

# Generate JUnit XML (for CI)
maestro test --format junit --output reports/ maestro/flows/

# Generate both formats
maestro test --format html,junit --output reports/ maestro/flows/
```

### Test Metrics

**Key Metrics Tracked:**
- Test execution time
- Pass/fail rates
- Flaky test identification
- Device/platform coverage

**Report Contents:**
- Test execution summary
- Individual test results
- Screenshots on failure
- Performance metrics
- Device information

## Best Practices

### Test Design
1. **Keep tests independent** - Each test should run in isolation
2. **Use meaningful test data** - Use realistic data that represents user scenarios
3. **Test happy and error paths** - Cover both success and failure scenarios
4. **Keep tests maintainable** - Use clear, descriptive test steps

### Performance
1. **Group related tests** - Run related tests together to minimize app restarts
2. **Use appropriate timeouts** - Balance test speed with reliability
3. **Clean up test data** - Ensure tests don't interfere with each other
4. **Optimize for CI** - Keep smoke tests fast for quick feedback

### Maintenance
1. **Update tests with app changes** - Keep tests in sync with UI changes
2. **Review test failures promptly** - Address flaky tests immediately
3. **Document test purpose** - Clear descriptions help with maintenance
4. **Regular test review** - Remove obsolete tests, add coverage for new features

## Extending the Test Suite

### Adding New Test Flows

1. Create new `.yaml` file in `maestro/flows/`
2. Follow naming convention: `##_descriptive_name.yaml`
3. Include appropriate tags
4. Add documentation to this README
5. Update CI/CD pipeline if needed

### Test Flow Template

```yaml
# New Test Flow Template
# Description of what this test flow covers

appId: com.expensetracker
tags:
  - your_tag
  - test_category

---

# Test: Description of specific test
- launchApp
- waitForAnimationToEnd:
    timeout: 5000

# Your test steps here
- tapOn: "element"
- assertVisible: "expected_text"

# Clean up
- tapOn: "back_button"
- assertVisible: "Home"
```

## Support and Troubleshooting

### Getting Help

- **Maestro Documentation:** https://maestro.mobile.dev/
- **Community Discord:** https://discord.gg/maestro
- **GitHub Issues:** Report test-specific issues in the project repository

### Common Commands Reference

```bash
# Basic test execution
maestro test flow.yaml

# Test with specific device
maestro --device emulator-5554 test flow.yaml

# Test with debug output
maestro test --debug flow.yaml

# Test with custom timeout
maestro test --timeout 60000 flow.yaml

# List connected devices
maestro devices

# Check Maestro version
maestro --version
```

This E2E testing setup provides comprehensive coverage of the Expense Tracker application, ensuring reliability and quality across all major user journeys and edge cases.