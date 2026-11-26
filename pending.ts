// You want this currency model:
// - Owner profile currency = default suggestion for a newly created vehicle.
// - Vehicle currency is chosen only in Additional settings during vehicle creation.
// - Fuel and expense forms never show a currency selector; they always inherit that vehicle’s currency.
// - One vehicle should use one currency consistently.
// - Currency can be edited from Vehicle Settings, with a clear warning.
// One important decision before I implement it: if a vehicle already has fuel/expense records, should currency editing be:
// 1. blocked after the first financial record — recommended, because changing it safely requires real exchange rates and historical conversions; or
// 2. allowed only after an explicit confirmation, changing future records only while old records retain their original currency?
// Which one do you want?