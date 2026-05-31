export function sourceColor(name: string, dark: boolean): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = ((hash % 360) + 360) % 360
  const sat = 60
  const light = dark ? 65 : 50
  return `hsl(${hue}, ${sat}%, ${light}%)`
}
