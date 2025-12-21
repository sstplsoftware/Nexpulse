// IST = UTC + 5:30
export function getISTDate(d = new Date()) {
  const istOffset = 330 * 60 * 1000; // 5h 30m
  return new Date(d.getTime() + istOffset);
}

// YYYY-MM-DD in IST (SAFE)
export function formatISTDate(d = new Date()) {
  const ist = getISTDate(d);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ist.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// HH:mm in IST (SAFE)
export function formatISTTime(d = new Date()) {
  const ist = getISTDate(d);
  const h = String(ist.getUTCHours()).padStart(2, "0");
  const m = String(ist.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}
