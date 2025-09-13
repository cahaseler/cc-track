console.log("Hello, World!");

// Simple function to greet a user
function greet(name: string): string {
  return `Hello, ${name}!`;
}

// Test the function
const userName = "Alice";
const greeting = greet(userName);
console.log(greeting);

// Array operations
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log("Doubled numbers:", doubled);