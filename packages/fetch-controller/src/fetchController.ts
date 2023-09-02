import type { AxiosInstance } from 'axios';
import { Logger } from './logger';
import {
  Methods,
  RequestInfo,
  RequestInfoHeaders,
  RequestInfoOptions,
} from './requestInfo';

interface InitiatorProperty {
  baseUrl?: string;
  url: string;
  headers?: RequestInfoHeaders;
  options?: RequestInfoOptions;
}

interface InitiatorWithBodyProperty<T> extends InitiatorProperty {
  body?: T;
}

export abstract class FetchController {
  private static _axiosInstance: AxiosInstance | undefined;
  private static _isPending = false;
  private static _baseUrl = '';
  static pendedRequests: RequestInfo<any>[] = [];

  static get axiosInstance() {
    return this._axiosInstance;
  }

  static get isPending() {
    return this._isPending;
  }

  static get baseUrl() {
    return this._baseUrl;
  }

  static usingAxios(instance: AxiosInstance) {
    this._axiosInstance = instance;
    this._baseUrl = instance.defaults.baseURL || '';
  }
  static setBaseUrl(baseUrl: string) {
    if (this.isUsingAxios()) {
      this._axiosInstance!.defaults.baseURL = baseUrl;
    }
    this._baseUrl = baseUrl;
  }

  private static isUsingAxios() {
    return Boolean(this._axiosInstance);
  }

  private static fcFetch<T>(request: RequestInfo<T>) {
    return fetch(request.baseUrl + request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(request.body),
      signal: request.abortController?.signal,
    });
  }

  private static fcAxios<T>(request: RequestInfo<T>) {
    const method = request.method;
    const client = this._axiosInstance;
    if (!client) throw new Error('Cannot find axios instance');
    switch (method) {
      case 'GET':
        return client.get(request.url, {
          headers: request.headers,
          signal: request.abortController?.signal,
        });
      case 'POST':
        return client.post(request.url, request.body, {
          headers: request.headers,
          signal: request.abortController?.signal,
        });
      case 'PUT':
        return client.put(request.url, request.body, {
          headers: request.headers,
          signal: request.abortController?.signal,
        });
      case 'DELETE':
        return client.delete(request.url, {
          headers: request.headers,
          signal: request.abortController?.signal,
        });
      case 'PATCH':
        return client.patch(request.url, request.body, {
          headers: request.headers,
          signal: request.abortController?.signal,
        });
      default:
        throw new Error('Cannot find method');
    }
  }

  private static withAbortFunction(
    promise: Promise<any>,
    abortFunction?: (reason?: any) => void,
  ) {
    return Object.assign(promise, { abort: abortFunction });
  }

  private static abortWithId(id: string) {
    const index = this.pendedRequests.findIndex((req) => req.id === id);
    if (index) {
      return this.pendedRequests.splice(index, 1)[0];
    }
  }

  private static _internalRequest<ReqType = unknown>(
    request: RequestInfo<ReqType>,
  ) {
    if (!this._isPending) {
      if (request.initiatePending) {
        this._isPending = true;
      }
      return this.withAbortFunction(
        this.isUsingAxios()
          ? this.fcAxios(request).then((value) => {
              this.processPendedRequests();
              return value;
            })
          : this.fcFetch(request).then((value) => {
              this.processPendedRequests();
              return value;
            }),
        request.abortController?.abort,
      );
    }
    return this.withAbortFunction(
      new Promise<ReqType>((res, rej) => {
        request.pending(res, rej);
        this.pendedRequests.push(request);
      }),
      () => {
        this.abortWithId(request.id)?.reject('Request aborted');
      },
    );
  }

  private static processPendedRequests() {
    this._isPending = false;
    const curRequest: RequestInfo<any>[] = [];
    while (this.pendedRequests.length > 0) {
      curRequest.push(this.pendedRequests.pop() as RequestInfo);
      if (curRequest[curRequest.length - 1].initiatePending) {
        break;
      }
    }
    Promise.all(curRequest.map((v) => this._internalRequest(v)));
  }

  private static getRequestInfo(
    props: InitiatorProperty | InitiatorWithBodyProperty<any>,
    method: Methods,
  ) {
    const baseUrl = this._baseUrl;
    return new RequestInfo({ baseUrl, ...props, method });
  }
  static get(props: InitiatorProperty) {
    return this._internalRequest(this.getRequestInfo(props, 'GET'));
  }
  static post<T>(props: InitiatorWithBodyProperty<T>) {
    return this._internalRequest(this.getRequestInfo(props, 'POST'));
  }
  static put<T>(props: InitiatorWithBodyProperty<T>) {
    return this._internalRequest(this.getRequestInfo(props, 'PUT'));
  }
  static patch<T>(props: InitiatorWithBodyProperty<T>) {
    return this._internalRequest(this.getRequestInfo(props, 'PATCH'));
  }
  static delete<T>(props: InitiatorWithBodyProperty<T>) {
    return this._internalRequest(this.getRequestInfo(props, 'DELETE'));
  }
}
