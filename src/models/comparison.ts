import { Operation } from "./operation";

type ComparisonStatus = 
        "Match" 
    |   "Mismatch"              // address or amount mismatch
    |   "Missing Operation"   
    |   "Extra Operation"

class Comparison {
    imported : Operation | undefined;
    actual : Operation | undefined;
    status: ComparisonStatus
}

export { Comparison, ComparisonStatus }
