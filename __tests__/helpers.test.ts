import BigNumber from "bignumber.js";
import { currencies } from "../src/configuration/currencies";
import { configuration } from "../src/configuration/settings";
import { retry, toAccountUnit, toBaseUnit } from "../src/helpers";
import { flushPromises } from "./test-utils";

describe("helpers", () => {
  describe("convert from unit of account to base unit", () => {
    describe("convert bitcoins to satoshis", () => {
      beforeEach(() => {
        configuration.currency = currencies.btc;
      });

      it("0.99999999 bitcoin ➝ 99999999 satoshis", () => {
        const AmountInBaseUnit = new BigNumber(0.99999999);
        const amountInAccountUnit = toBaseUnit(AmountInBaseUnit);
        expect(amountInAccountUnit).toEqual("99999999");
      });

      it("1 bitcoin ➝ 100000000 satoshis", () => {
        const AmountInBaseUnit = new BigNumber(1);
        const amountInAccountUnit = toBaseUnit(AmountInBaseUnit);
        expect(amountInAccountUnit).toEqual("100000000");
      });

      it("1.23456789 bitcoin ➝ 123456789 satoshis", () => {
        const AmountInBaseUnit = new BigNumber(1.23456789);
        const amountInAccountUnit = toBaseUnit(AmountInBaseUnit);
        expect(amountInAccountUnit).toEqual("123456789");
      });

      it("123456789 bitcoins ➝ 12345678900000000 satoshis", () => {
        const AmountInBaseUnit = new BigNumber(123456789);
        const amountInAccountUnit = toBaseUnit(AmountInBaseUnit);
        expect(amountInAccountUnit).toEqual("12345678900000000");
      });
    });

    describe("convert litecoins to litoshi", () => {
      beforeEach(() => {
        configuration.currency = currencies.ltc;
      });

      it("0.99999999 litecoin ➝ 99999999 litoshis", () => {
        const AmountInBaseUnit = new BigNumber(0.99999999);
        const amountInAccountUnit = toBaseUnit(AmountInBaseUnit);
        expect(amountInAccountUnit).toEqual("99999999");
      });

      it("1 litecoin ➝ 100000000 litoshis", () => {
        const AmountInBaseUnit = new BigNumber(1);
        const amountInAccountUnit = toBaseUnit(AmountInBaseUnit);
        expect(amountInAccountUnit).toEqual("100000000");
      });

      it("1.23456789 litecoin ➝ 123456789 litoshis", () => {
        const AmountInBaseUnit = new BigNumber(1.23456789);
        const amountInAccountUnit = toBaseUnit(AmountInBaseUnit);
        expect(amountInAccountUnit).toEqual("123456789");
      });

      it("123456789 litecoins ➝ 12345678900000000 litoshis", () => {
        const AmountInBaseUnit = new BigNumber(123456789);
        const amountInAccountUnit = toBaseUnit(AmountInBaseUnit);
        expect(amountInAccountUnit).toEqual("12345678900000000");
      });
    });

    describe("convert ethers to weis", () => {
      beforeEach(() => {
        configuration.currency = currencies.eth;
      });

      it("0.99999999 ether ➝ 999999990000000000 weis", () => {
        const AmountInBaseUnit = new BigNumber(0.99999999);
        const amountInAccountUnit = toBaseUnit(AmountInBaseUnit);
        expect(amountInAccountUnit).toEqual("999999990000000000");
      });

      it("1 ether ➝ 1000000000000000000 weis", () => {
        const AmountInBaseUnit = new BigNumber(1);
        const amountInAccountUnit = toBaseUnit(AmountInBaseUnit);
        expect(amountInAccountUnit).toEqual("1000000000000000000");
      });

      it("1.23456789 ether ➝ 1234567890000000000 weis", () => {
        const AmountInBaseUnit = new BigNumber(1.23456789);
        const amountInAccountUnit = toBaseUnit(AmountInBaseUnit);
        expect(amountInAccountUnit).toEqual("1234567890000000000");
      });

      it("123456789 ethers ➝ 123456789000000000000000000 weis", () => {
        const AmountInBaseUnit = new BigNumber(123456789);
        const amountInAccountUnit = toBaseUnit(AmountInBaseUnit);
        expect(amountInAccountUnit).toEqual("123456789000000000000000000");
      });
    });
  });

  describe("convert from base unit to unit of account", () => {
    describe("convert satoshis to bitcoin", () => {
      beforeEach(() => {
        configuration.currency = currencies.btc;
      });

      it("1 satoshi ➝ 0.00000001 bitcoin", () => {
        const amountInAccountUnit = new BigNumber(1);
        const AmountInBaseUnit = toAccountUnit(amountInAccountUnit);
        expect(AmountInBaseUnit).toEqual("0.00000001");
      });

      it("10 satoshis ➝ 0.0000001 bitcoin", () => {
        const amountInAccountUnit = new BigNumber(10);
        const AmountInBaseUnit = toAccountUnit(amountInAccountUnit);
        expect(AmountInBaseUnit).toEqual("0.0000001");
      });

      it("9999999999 satoshis ➝ 99.99999999 bitcoins", () => {
        const amountInAccountUnit = new BigNumber(9999999999);
        const AmountInBaseUnit = toAccountUnit(amountInAccountUnit);
        expect(AmountInBaseUnit).toEqual("99.99999999");
      });

      it("10000000000 satoshis ➝ 100 bitcoins", () => {
        const amountInAccountUnit = new BigNumber(10000000000);
        const AmountInBaseUnit = toAccountUnit(amountInAccountUnit);
        expect(AmountInBaseUnit).toEqual("100");
      });
    });

    describe("convert litoshis to litecoins", () => {
      beforeEach(() => {
        configuration.currency = currencies.ltc;
      });

      it("1 litoshi ➝ 0.00000001 litecoins", () => {
        const amountInAccountUnit = new BigNumber(1);
        const AmountInBaseUnit = toAccountUnit(amountInAccountUnit);
        expect(AmountInBaseUnit).toEqual("0.00000001");
      });

      it("10 litoshis ➝ 0.0000001 litecoins", () => {
        const amountInAccountUnit = new BigNumber(10);
        const AmountInBaseUnit = toAccountUnit(amountInAccountUnit);
        expect(AmountInBaseUnit).toEqual("0.0000001");
      });

      it("9999999999 litoshis ➝ 99.99999999 litecoins", () => {
        const amountInAccountUnit = new BigNumber(9999999999);
        const AmountInBaseUnit = toAccountUnit(amountInAccountUnit);
        expect(AmountInBaseUnit).toEqual("99.99999999");
      });

      it("10000000000 litoshis ➝ 100 litecoins", () => {
        const amountInAccountUnit = new BigNumber(10000000000);
        const AmountInBaseUnit = toAccountUnit(amountInAccountUnit);
        expect(AmountInBaseUnit).toEqual("100");
      });
    });

    describe("convert weis to ethers", () => {
      beforeEach(() => {
        configuration.currency = currencies.eth;
      });

      it("1 wei ➝ 0.00000000 ether (because of the 10-digit precision)", () => {
        const amountInAccountUnit = new BigNumber(1);
        const AmountInBaseUnit = toAccountUnit(amountInAccountUnit);
        expect(AmountInBaseUnit).toEqual("0.0000000000");
      });

      it("100000000 weis ➝ 0.0000000001 ether", () => {
        const amountInAccountUnit = new BigNumber(100000000);
        const AmountInBaseUnit = toAccountUnit(amountInAccountUnit);
        expect(AmountInBaseUnit).toEqual("0.0000000001");
      });

      it("1000000000 weis ➝ 0.0000000010 ether", () => {
        const amountInAccountUnit = new BigNumber(1000000000);
        const AmountInBaseUnit = toAccountUnit(amountInAccountUnit);
        expect(AmountInBaseUnit).toEqual("0.0000000010");
      });

      it("9999999999 weis ➝ 0.0000000100 ether (round up)", () => {
        const amountInAccountUnit = new BigNumber(9999999999);
        const AmountInBaseUnit = toAccountUnit(amountInAccountUnit);
        expect(AmountInBaseUnit).toEqual("0.0000000100");
      });

      it("1000000000000000000 weis ➝ 1 ether", () => {
        const amountInAccountUnit = new BigNumber(1000000000000000000);
        const AmountInBaseUnit = toAccountUnit(amountInAccountUnit);
        expect(AmountInBaseUnit).toEqual("1.0000000000");
      });

      it("1000000000000000000000 weis ➝ 1000 ethers", () => {
        const amountInAccountUnit = new BigNumber(1000000000000000000000);
        const AmountInBaseUnit = toAccountUnit(amountInAccountUnit);
        expect(AmountInBaseUnit).toEqual("1000.0000000000");
      });
    });
  });

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
      const retriesCount = 23;
      const mock = {
        job: async () => {
          throw new Error("Job failed");
        },
      };
      let err;
      const spy = jest.spyOn(mock, "job");
      try {
        await retry(mock.job, { retries: retriesCount });
      } catch (e) {
        err = e;
      }
      expect(spy).toHaveBeenCalledTimes(retriesCount);
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
