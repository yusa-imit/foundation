import { AxiosResponse } from 'axios';
import { ResponseProcessMethod, RequestInfo } from '../requestInfo';
import { FetchControllerResult } from '../fetchController';

export function getAxiosProcessData<T>(
  res: AxiosResponse,
  request: RequestInfo<T>,
): FetchControllerResult {
  return {
    status: res.status,
    data: res.data,
    requestInfo: request,
  };
}
