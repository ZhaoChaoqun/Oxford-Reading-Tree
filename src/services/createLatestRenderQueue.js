export function createLatestRenderQueue() {
  let running = false;
  let pending = null;
  let generation = 0;

  async function execute(token, work, resolve, reject) {
    running = true;

    try {
      resolve(await work(() => token !== generation));
    } catch (error) {
      reject(error);
    } finally {
      running = false;

      if (pending) {
        const next = pending;
        pending = null;
        void execute(next.token, next.work, next.resolve, next.reject);
      }
    }
  }

  return {
    run(work) {
      const token = ++generation;

      return new Promise((resolve, reject) => {
        if (!running) {
          void execute(token, work, resolve, reject);
          return;
        }

        if (pending) {
          pending.resolve(undefined);
        }

        pending = { token, work, resolve, reject };
      });
    },

    invalidate() {
      generation += 1;

      if (pending) {
        pending.resolve(undefined);
        pending = null;
      }
    },
  };
}