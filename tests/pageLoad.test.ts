import { describe, it, expect } from "vitest";
import { PageLoadCoordinator } from "../src/lib/pageLoad";
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
describe("route prerequisites", () => {
  it("does not finish until all required work completes", async () => {
    const a = deferred(),
      b = deferred();
    const loader = new PageLoadCoordinator(() => {});
    const running = loader.run([() => a.promise, () => b.promise]);
    a.resolve();
    await Promise.resolve();
    expect(loader.state).toMatchObject({
      pending: true,
      completed: 1,
      total: 2,
    });
    b.resolve();
    await running;
    expect(loader.state.pending).toBe(false);
  });
  it("ignores completions from cancelled navigation", async () => {
    const a = deferred();
    const loader = new PageLoadCoordinator(() => {});
    const running = loader.run([() => a.promise]);
    loader.cancel();
    a.resolve();
    await running;
    expect(loader.state).toMatchObject({
      pending: false,
      completed: 0,
      total: 0,
    });
  });
  it("clears loading on error and does not hide the error on late success", async () => {
    const a = deferred();
    const loader = new PageLoadCoordinator(() => {});
    const running = loader.run([
      () => Promise.reject(new Error("offline")),
      () => a.promise,
    ]);
    await Promise.resolve();
    expect(loader.state.pending).toBe(false);
    a.resolve();
    await running;
    expect(loader.state.error?.message).toBe("offline");
  });
});
