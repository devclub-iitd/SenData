// Taken from https://stackoverflow.com/a/18650828/5585431
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) {
    return "0 Bytes";
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatTime(time: number): string {
  time /= 1000;
  const sec = Math.round(time % 60);
  time /= 60;
  const min = Math.round(time % 60);
  time /= 60;
  const hour = Math.round(time);

  let text = "";
  if (hour !== 0) { text += `${hour} h `; }
  if (min !== 0) { text += `${min} m `; }
  if (sec !== 0) { text += `${sec} s `; }
  return text;
}
