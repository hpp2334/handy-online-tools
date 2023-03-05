type Enum<E> = Record<keyof E, number | string> & { [k: number]: string };

export function safeGetFromMap<K, V>(map: Map<K, V>, key: K): V {
  if (!map.has(key)) {
    throw Error(`map not has key "${key}"`);
  }
  return map.get(key)!;
}

export function getNumbericEnumValues<T extends Enum<T>>(x: T) {
  return Object.keys(x)
    .filter((x) => /^[0-9]+$/.test(x))
    .map(Number) as any as T[keyof T][];
}

export async function copyText(value: string) {
  const el = document.createElement("textarea");
  el.value = value;
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}

export function downloadBuffer(filename: string, buf: ArrayBuffer) {
  var blob = new Blob([buf], { type: "application/octet-stream" });
  var link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
