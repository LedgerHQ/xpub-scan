import { AddressType } from "../configuration/currencies";
import { TODO_TypeThis } from "../types";

class Currency {
  name: string;
  symbol: string;
  network?: TODO_TypeThis;
  addressTypes: Array<AddressType>;
  precision: number;
}

export { Currency };
