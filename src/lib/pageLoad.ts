export type LoadState = {
  pending: boolean;
  completed: number;
  total: number;
  error: Error | null;
};
/** A generation prevents late completions from an abandoned navigation changing this route. */
export class PageLoadCoordinator {
  private generation = 0;
  state: LoadState = { pending: false, completed: 0, total: 0, error: null };
  constructor(private publish: (state: LoadState) => void) {}
  cancel() {
    this.generation++;
    this.state = { pending: false, completed: 0, total: 0, error: null };
    this.publish(this.state);
  }
  async run(prerequisites: (() => Promise<unknown>)[]) {
    const generation = ++this.generation;
    this.state = {
      pending: prerequisites.length > 0,
      completed: 0,
      total: prerequisites.length,
      error: null,
    };
    this.publish(this.state);
    await Promise.all(
      prerequisites.map(async (task) => {
        try {
          await task();
          if (generation !== this.generation) return;
          this.state = { ...this.state, completed: this.state.completed + 1 };
          if (this.state.completed === this.state.total)
            this.state.pending = false;
          this.publish(this.state);
        } catch (error) {
          if (generation !== this.generation) return;
          this.generation++;
          this.state = {
            ...this.state,
            pending: false,
            error: error instanceof Error ? error : new Error(String(error)),
          };
          this.publish(this.state);
        }
      }),
    );
  }
}
