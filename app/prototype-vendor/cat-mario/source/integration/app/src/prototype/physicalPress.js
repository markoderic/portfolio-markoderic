// Read native fields without inventing identity or a trusted gesture.
// Physical activation belongs to matching down/up, never a compatibility click.
export const pressField = (event, key) => event?.[key] ?? event?.nativeEvent?.[key];
export const finitePoint = event => Number.isFinite(pressField(event,'clientX')) && Number.isFinite(pressField(event,'clientY'));
