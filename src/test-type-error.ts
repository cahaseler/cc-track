// This file has deliberate type errors to test edit validation

export function addNumbers(a: number, b: number): number {
  // Type error: trying to assign string to number
  const result: number = "this is not a number";

  // Another type error: calling method that doesn't exist
  return a.toUpperCase() + b;
}

// Type error: missing required property
interface User {
  name: string;
  age: number;
}

const user: User = {
  name: "Test"
  // Missing 'age' property
};