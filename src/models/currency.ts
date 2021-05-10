import { AddressType } from "../configuration/currencies";

class Currency {
  name: string;
  symbol: string;
  network?: any;
  addressTypes: Array<AddressType>;
  precision: number;
}

export { Currency };
