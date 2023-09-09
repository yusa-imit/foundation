export async function fetchDocument(response: Response) {
  const str = await response.text();
  const parser = new DOMParser();
  return parser.parseFromString(str, 'text/html');
}
