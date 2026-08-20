function assertNever(obj: never): never {
	throw new Error(`Unexpected: ${typeof obj === "object" ? JSON.stringify(obj) : String(obj)}`);
}
export default assertNever;
