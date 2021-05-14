import { Operation } from "./operation";

type ComparisonStatus =
  | "Match" // perfect match between imported and actual operation
  | "Match (aggregated)" // aggregated operation
  | "Missing (aggregated)" // aggregation operation (resulting missing imported operation)
  | "Mismatch" // address or amount mismatch
  | "Missing Operation" // missing expected imported operation
  | "Extra Operation"; // imported operation without corresponding actual operation

class Comparison {
  imported: Operation | undefined;
  actual: Operation | undefined;
  status: ComparisonStatus;
}

export { Comparison, ComparisonStatus };
