import { expect, it } from "vitest";
import { csvCell, recordsCsv } from "../src/features/reports/csv";

it("protects spreadsheet exports against formulas including leading whitespace", () => {
  expect(csvCell("=1+1")).toBe('"\'=1+1"');
  expect(csvCell("  =1+1")).toBe('"\'  =1+1"');
  expect(csvCell("\t@value")).toBe('"\'\t@value"');
  expect(csvCell('normal "value"')).toBe('"normal ""value"""');
  const csv = recordsCsv([
    {
      kind: "expenses",
      id: "1",
      payload: { title: "  +formula" },
      created_at: "now",
      status: "ACTIVE",
    },
  ]);
  expect(csv).toContain('"\'  +formula"');
});
