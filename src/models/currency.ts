import { DerivationMode } from "../configuration/currencies";
import { TODO_TypeThis } from "../types";

class Currency {
  name: string;
  symbol: string;
  network?: TODO_TypeThis;
  derivationModes: Array<DerivationMode>;
  precision: number;
}

export { Currency };
