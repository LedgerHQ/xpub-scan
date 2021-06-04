import { retry } from "../src/helpers";
import { flushPromises } from "./test-utils";

describe("helpers", () => {
  describe("retry", () => {
    it("should try only 1 time if job is successful", async () => {
      const job = jest.fn();
      await retry(job);
      expect(job).toHaveBeenCalledTimes(1);
    });

    it("should retry and succeed on the second time", async () => {
      let nonce = 0;
      const mock = {
        job: async () => {
          nonce++;
          if (nonce === 2) return { result: "test" };
          throw new Error("Job failed");
        },
      };
      const spy = jest.spyOn(mock, "job");
      const res = await retry(mock.job);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(res).toEqual({ result: "test" });
    });

    it("should error after all retries has been consumed", async () => {
      const mock = {
        job: async () => {
          throw new Error("Job failed");
        },
      };
      let err;
      const spy = jest.spyOn(mock, "job");
      try {
        await retry(mock.job, { retries: 23 });
      } catch (e) {
        err = e;
      }
      expect(spy).toHaveBeenCalledTimes(23);
      expect(err).toEqual(new Error("Job failed"));
    });

    it("should allow delaying each retry", async () => {
      let nonce = 0;
      const mock = {
        job: async () => {
          nonce++;
          if (nonce === 3) return { result: "test" };
          throw new Error("Job failed");
        },
      };
      const spy = jest.spyOn(mock, "job");
      jest.useFakeTimers("legacy");
      const promise = retry(mock.job, { retryDelayMS: 500 });

      await flushPromises();
      expect(spy).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(500);
      await flushPromises();

      expect(spy).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(500);
      await flushPromises();

      expect(spy).toHaveBeenCalledTimes(3);

      const res = await promise;
      expect(res).toEqual({ result: "test" });
    });
  });
});
