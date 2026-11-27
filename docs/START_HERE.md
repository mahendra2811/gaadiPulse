# Start here

The three implementation stages are complete in source. Use the [documentation index](README.md) to find the current references.

## First read

1. [Product brief](GAADIPULSE_COMPREHENSIVE_PRODUCT_BRIEF.md) for current scope and availability caveats.
2. [Project reference](../PROJECT_REFERENCE.md) and [decisions](DECISIONS.md) before implementation changes.
3. [Latest stage handoff](STAGE_3_HANDOFF.md) for actual validation evidence and outstanding work.
4. [Online-only plan](ONLINE_ONLY_PLAN.md) and [external setup/release](EXTERNAL_SETUP_AND_RELEASE.md) before connecting or releasing a real backend.

## Local development

Follow [local setup](LOCAL_SETUP.md). Keep secrets out of source control and use a disposable local database for destructive migration experiments. Never reset a real project.

## Before release

Use the [QA matrix](QA_TEST_MATRIX.md), [feature acceptance scenarios](FEATURE_ACCEPTANCE_MATRIX.md), and [Android release commands](ANDROID_RELEASE_COMMANDS.md). Complete only the checks you can actually execute and record their results in a new stage handoff; do not infer hosted or device verification from source inspection or bundle export.
