import { Address } from "./address"

// addresses belonging to the same xpub
class OwnAddresses {
    internal: string[];
    external: string[];

    constructor() {
      this.internal = [];
      this.external = [];
    }

    addAddress(address: Address) {
      if (address.getDerivation().account === 1) {
        // here, it is assumed that addresses belonging
        // to account 1 are internal addresses
        // (that is: change addresses)
        // TODO: check/challenge this assumption
        this.internal.push(address.toString());
      }
      else {
        this.external.push(address.toString());
      }
    }

    getInternalAddresses() {
      return this.internal;
    }

    getExternalAddresses() {
      return this.external;
    }

    getAllAddress() {
      return this.internal.concat(this.external);
    }
}

export { OwnAddresses }
