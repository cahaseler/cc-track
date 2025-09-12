// Test file with intentional TypeScript error
export const myNumber: number = "this should be a number"; // Type error!

export function brokenFunction() {
  const result = unknownVariable; // Reference error!
  return result;
}