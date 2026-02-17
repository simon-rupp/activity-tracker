import bcrypt from "bcryptjs";

const passcode = process.argv[2];

if (!passcode) {
  console.error("Usage: npm run hash:passcode -- <your-passcode>");
  process.exit(1);
}

const hash = bcrypt.hashSync(passcode, 12);
const escapedForEnv = hash.replace(/\$/g, "\\$");

console.log("Raw bcrypt hash:");
console.log(hash);
console.log("");
console.log("Paste this into .env for Next.js:");
console.log(`APP_PASSCODE_HASH="${escapedForEnv}"`);
