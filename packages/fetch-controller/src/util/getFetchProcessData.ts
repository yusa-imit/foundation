import { ResponseProcessMethod } from '../fcRequestInfo';
import { fetchDocument } from './fetchDocument';
import { fetchStream } from './fetchStream';

export async function getFetchProcessData(
  res: Response,
  type: ResponseProcessMethod,
) {
  switch (type) {
    case ResponseProcessMethod.ARRAYBUFFER:
      return await res.arrayBuffer();
    case ResponseProcessMethod.BLOB:
      return await res.blob();
    case ResponseProcessMethod.DOCUMENT:
      return await fetchDocument(res);
    case ResponseProcessMethod.JSON:
      return await res.json();
    case ResponseProcessMethod.STREAM:
      return await fetchStream(res);
    case ResponseProcessMethod.TEXT:
      return await res.text();
    default:
      return res.json();
  }
}
