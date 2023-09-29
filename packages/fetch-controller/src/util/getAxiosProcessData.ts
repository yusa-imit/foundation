import { AxiosResponse } from 'axios';
import { ResponseProcessMethod, FCRequestInfo } from '../fcRequestInfo';
import { FetchControllerResult } from '../fetchController';

export function getAxiosProcessData<T>(
  res: AxiosResponse,
  request: FCRequestInfo<T>,
): FetchControllerResult {
  return {
    status: res.status,
    data: res.data,
    requestInfo: request,
  };
}
