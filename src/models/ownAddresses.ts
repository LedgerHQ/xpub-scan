import { Address } from "./address";

// addresses belonging to the same xpub
class OwnAddresses {
  internal: Array<string>;
  external: Array<string>;

  constructor() {
    this.internal = [];
    this.external = [];
  }

  addAddress(address: Address) {
    // here, it is assumed that addresses belonging
    // to account 1 are internal addresses
    // (that is: change addresses)
    if (address.getDerivation().account === 1) {
      this.internal.push(address.toString());
    } else {
      this.external.push(address.toString());
    }
  }

  getInternalAddresses() {
    return this.internal;
  }

  getExternalAddresses() {
    return this.external;
  }

  getAllAddresses() {
    return this.internal.concat(this.external);
  }
}

export { OwnAddresses };
