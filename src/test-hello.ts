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

// Object manipulation
interface Person {
  name: string;
  age: number;
}

const person: Person = {
  name: "Bob",
  age: 30
};

console.log(`${person.name} is ${person.age} years old`);

// Simple async function
async function fetchData(): Promise<string> {
  return new Promise(resolve => {
    setTimeout(() => resolve("Data loaded!"), 100);
  });
}

// Call the async function
fetchData().then(data => console.log(data));