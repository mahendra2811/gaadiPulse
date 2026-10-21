import { domainCopy } from "@/src/lib/domainCopy";
export function expenseAccounting(
  amount: number,
  category: string,
  principal: number | null,
  interest: number | null,
) {
  if (category !== "EMI")
    return { cash: amount, operating: amount, financing: 0, unclassified: 0 };
  if (principal === null)
    return {
      cash: amount,
      operating: 0,
      financing: interest ?? 0,
      unclassified: amount - (interest ?? 0),
    };
  if (
    principal < 0 ||
    principal > amount ||
    (interest ?? 0) + principal > amount
  )
    throw new Error(domainCopy.emi);
  return {
    cash: amount,
    operating: 0,
    financing: interest ?? amount - principal,
    unclassified: interest === null ? 0 : amount - principal - interest,
  };
}
