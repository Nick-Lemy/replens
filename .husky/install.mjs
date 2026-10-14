if (
  process.env.NODE_ENV === "production" ||
  process.env.CI === "true" ||
  process.env.HUSKY === "0"
) {
  process.exit(0);
}

const { default: install } = await import("husky");
const result = install();
if (result) {
  console.error(result);
  process.exitCode = 1;
}
