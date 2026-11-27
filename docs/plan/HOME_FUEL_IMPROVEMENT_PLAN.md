# Home and fuel improvements

1. Refresh the active vehicle's latest authorized observations when Home regains focus and after confirmed record writes. Preserve observation timestamps and source records; enforce nondecreasing readings against neighboring observations for manual, fuel and expense entries, allowing truthful late entries.
2. Compact the reusable vehicle header and Home activity/reminder rows, keeping identity, role, meter mode and energy legible on small screens.
3. Simplify fuel entry copy and layout while retaining full/partial fill, dates, price, readings and other data needed for valid future full-to-full insights.
4. Improve fuel history with working date and amount filters, bounded incremental loading, compact details and accessible icon actions. Resolve submitter identity only through an authorized server interface; never expose arbitrary account data.
5. Test reading chronology, query refresh, filters, migration chain and affected screens; document validation and deployment requirements. Preserve financial and Pilot permissions.
