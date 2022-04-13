import BigNumber from "bignumber.js";

class Stats {
  txsCount: BigNumber; // total number of transactions
  funded: BigNumber; // total received
  spent: BigNumber; // total sent
}

export { Stats };
