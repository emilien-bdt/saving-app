#!/usr/bin/env node
// Generates AUTH_PASSWORD_HASH (+ a fresh AUTH_SECRET) for .env / Vercel.
// Usage: npm run auth:hash            (prompts, input hidden)
//        echo -n "pw" | npm run auth:hash
// Same format as src/shared/auth/password.ts (checked by password.test.ts).
import { randomBytes, scrypt } from "node:crypto";
import { pathToFileURL } from "node:url";

const PARAMS = { N: 2 ** 14, r: 8, p: 1 };
const KEY_LENGTH = 64;

/**
 * @param {string} password
 * @returns {Promise<string>}
 */
export function hashPassword(password) {
  const salt = randomBytes(16);
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { ...PARAMS, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) return reject(error);
      resolve(["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64url"), key.toString("base64url")].join(":"));
    });
  });
}

function readHidden(prompt) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    stdin.on("data", function onData(char) {
      if (char === "\r" || char === "\n" || char === "\u0004") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off("data", onData);
        stdout.write("\n");
        resolve(value);
      } else if (char === "\u0003") {
        process.exit(130);
      } else if (char === "\u007f") {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    });
  });
}

async function readPiped() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data.replace(/\r?\n$/, "");
}

async function main() {
  const password = process.stdin.isTTY ? await readHidden("Mot de passe : ") : await readPiped();
  if (password.length < 12) {
    console.error("Mot de passe trop court (12 caractères minimum).");
    process.exit(1);
  }
  console.log(`AUTH_PASSWORD_HASH="${await hashPassword(password)}"`);
  console.log(`AUTH_SECRET="${randomBytes(32).toString("base64url")}"`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
