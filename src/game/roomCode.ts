export function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "SM";
  for (let i = 0; i < 4; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export function sanitizeRoomCode(code: string) {
  const cleaned = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return cleaned || createRoomCode();
}
