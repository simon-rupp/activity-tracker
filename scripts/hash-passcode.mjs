import bcrypt from "bcryptjs";

const passcode = process.argv[2];

if (!passcode) {
  console.error("Usage: npm run hash:passcode -- <your-passcode>");
  process.exit(1);
}

const hash = bcrypt.hashSync(passcode, 12);
console.log(hash);
