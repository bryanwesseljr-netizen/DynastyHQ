const decodeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const decodeFirestoreValue = (value = {}) => {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('integerValue' in value) return decodeNumber(value.integerValue);
  if ('doubleValue' in value) return decodeNumber(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('stringValue' in value) return value.stringValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('geoPointValue' in value) return value.geoPointValue;
  if ('bytesValue' in value) return value.bytesValue;
  if ('arrayValue' in value) return (value.arrayValue?.values || []).map(decodeFirestoreValue);
  if ('mapValue' in value) return decodeFirestoreFields(value.mapValue?.fields || {});
  return undefined;
};

export const decodeFirestoreFields = (fields = {}) => Object.fromEntries(
  Object.entries(fields || {}).map(([key, value]) => [key, decodeFirestoreValue(value)]),
);

export const decodeFirestoreDocument = (document = {}) => decodeFirestoreFields(document.fields || {});
