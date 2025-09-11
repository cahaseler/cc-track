// Test file to verify stop hook adds untracked files
// Adding a modification to test the stop hook review
export function testUntrackedHandling(): void {
  console.log("This file should be automatically added by stop hook");
  console.log("Additional line for testing");
}