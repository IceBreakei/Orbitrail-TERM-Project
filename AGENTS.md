# Project activity memory

- Work in Development unless the user explicitly requests another target. Preserve existing edits.
- `Memory Activity Log.txt` is the reading-order guide for the user's exhaustive recoverable activity archive in numbered `Memory Activity Log Parts/*.txt` files, beginning October 30, 2026 at 8:54 AM. Use it as additional memory after context loss.
- Start with the reading-order guide and `Memory Activity Log.index.json`; search for relevant prompts, corrections, file paths and record numbers. Use index file/part_line/part_byte to read only relevant ranges. Read numbered parts in order when tracing context; a record may continue across parts. Do not load the entire log into context.
- Later user corrections override earlier historical decisions. Verify current code instead of assuming an old logged implementation is still current.
- Keep `chat_log.txt` updated with the prompt, visible responses, changes and validation. Preserve its existing encoding by appending.
- Before ending project work, refresh the archive with `python tools/update_memory_activity_log.py`. The optional `--final-response` records the exact prepared final answer before it is sent. A subsequent refresh also picks up that answer from its original session record.
- Preserve verbatim visible messages, recorded patches and code-writing commands. Do not substitute summaries for recoverable content, fabricate missing intermediate code, or claim source-truncated output is complete.
- Do not include private reasoning or system/developer messages in the archive. Its generator filters those record types.

# Release version policy

- Every released update must advance the Alpha version. Group related small changes into one patch release; rebuilds/retries of the same release keep the version.
- Version source: Development/release-version.json. Major: milestone-scale updates (for example completing all basic weapons). Minor: significant content/features/new weapons. Patch: grouped fixes, balance and small changes.
- Normally roll 10 accumulated patches into the next minor version (X.Y.9 -> X.(Y+1).0). Use judgment for milestone-based major/minor advancement; major/minor bumps reset lower components. User allows roughly 10-15 patches, with 10 the default.
- Update the release notes with the version/reason. Do not infer major milestones from the number of minor releases alone.
