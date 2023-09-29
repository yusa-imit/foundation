import type { AxiosInstance, AxiosResponse } from 'axios';
import {
  Methods,
  FCRequestInfo,
  RequestInfoHeaders,
  RequestInfoOptions,
} from './fcRequestInfo';
import { getAxiosProcessData } from './util/getAxiosProcessData';
import { getFetchProcessData } from './util/getFetchProcessData';
import { FCLogLevel, FCLogger } from './fcLogger';

export interface InitiatorProperty {
  url: string;
  baseUrl?: string;
  headers?: RequestInfoHeaders;
  options?: RequestInfoOptions;
}

export type InitiatorPropertyWithoutUrl = Omit<InitiatorProperty, 'url'>;

export interface InitiatorPropertyWithBody<T> extends InitiatorProperty {
  body?: T;
}

export interface PromiseWithAbort<RQ = unknown, RS = any> extends Promise<RS> {
  abort: (reason?: any) => FCRequestInfo<RQ>;
}

export interface FetchControllerResult<RQ = any, RS = any> {
  data: RS;
  status: number;
  requestInfo: FCRequestInfo<RQ>;
}

export abstract class FetchController {
  private static _axiosInstance: AxiosInstance | undefined;
  private static _isPending = false;
  private static _baseUrl = '';
  private static hashMap = new Map<string, PromiseWithAbort<any, any>>();
  static pendedRequests: FCRequestInfo<any>[] = [];

  static setLogLevel(level: FCLogLevel) {
    FCLogger.setLogLevel(level);
  }

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

  private static async fcFetch<RQ = unknown, RS = unknown>(
    request: FCRequestInfo<RQ>,
  ): Promise<FetchControllerResult<RQ, RS>> {
    const res = await fetch(request.baseUrl + request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(request.body),
      signal: request.abortController.signal,
    });
    const status = res.status;
    const data = await getFetchProcessData(res, request.resultProcessIn);
    request.complete();
    return {
      status,
      data,
      requestInfo: request,
    };
  }

  private static async axiosMethodProcess<T, R>(
    request: FCRequestInfo<T>,
  ): Promise<AxiosResponse<R>> {
    const method = request.method;
    const client = this._axiosInstance;
    if (!client) throw new Error('Cannot find axios instance');
    switch (method) {
      case 'GET':
        return await client.get(request.url, {
          headers: request.headers,
          signal: request.abortController.signal,
        });
      case 'POST':
        return await client.post(request.url, request.body, {
          headers: request.headers,
          signal: request.abortController.signal,
        });
      case 'PUT':
        return await client.put(request.url, request.body, {
          headers: request.headers,
          signal: request.abortController.signal,
        });
      case 'DELETE':
        return await client.delete(request.url, {
          headers: request.headers,
          signal: request.abortController.signal,
        });
      case 'PATCH':
        return await client.patch(request.url, request.body, {
          headers: request.headers,
          signal: request.abortController.signal,
        });
      default:
        throw new Error('Cannot find method');
    }
  }

  private static async fcAxios<T, R>(
    request: FCRequestInfo<T>,
  ): Promise<FetchControllerResult<T, R>> {
    return getAxiosProcessData(await this.axiosMethodProcess(request), request);
  }

  private static withAbortFunction<T = unknown, R = unknown>(
    promise: Promise<R>,
    abortFunction: (reason?: any) => FCRequestInfo<T>,
  ): PromiseWithAbort<T, R> {
    return Object.assign(promise, { abort: abortFunction });
  }

  private static abortWithId(id: string) {
    const index = this.pendedRequests.findIndex((req) => req.id === id);
    if (index) {
      return this.pendedRequests.splice(index, 1)[0];
    }
  }

  private static _internalRequest<RQ = unknown, RS = unknown>(
    request: FCRequestInfo<RQ>,
    runInProcessPended = false,
  ): PromiseWithAbort<RQ, FetchControllerResult<RQ, RS>> {
    FCLogger.gotRequestInfoLog(request);
    if (!runInProcessPended) {
      const check = this.hashMap.get(request.requestHash);
      if (check) {
        FCLogger.gotDuplicatedRequestInfoLog(request);
        return check as PromiseWithAbort<RQ, FetchControllerResult<RQ, RS>>;
      }
    }
    if (!this._isPending) {
      if (request.initiatePending) {
        this._isPending = true;
      }
      const instantRequestPromise = new Promise<FetchControllerResult<RQ, RS>>(
        (res, rej) => {
          request.send(res, rej);
          this.isUsingAxios()
            ? this.fcAxios<RQ, RS>(request)
                .then((value) => {
                  request.complete();
                  FCLogger.showInstantRequestLog(request);
                  res(value);
                })
                .catch((e) => {
                  FCLogger.showErrorLog(request, e);
                  rej(e);
                })
                .finally(() => {
                  this.processPendedRequests()?.then(() => {
                    FCLogger.endPendedRequestLog();
                  });
                  this.hashMap.delete(request.requestHash);
                })
            : this.fcFetch<RQ, RS>(request)
                .then((value) => {
                  request.complete();
                  FCLogger.showInstantRequestLog(request);
                  res(value);
                })
                .catch((e) => {
                  FCLogger.showErrorLog(request, e);
                  rej(e);
                })
                .finally(() => {
                  this.processPendedRequests()?.then(() => {
                    FCLogger.endPendedRequestLog();
                  });
                  this.hashMap.delete(request.requestHash);
                });
        },
      );
      const promise = this.withAbortFunction<RQ, FetchControllerResult<RQ, RS>>(
        instantRequestPromise,
        (reason?: any) => {
          request.abortController.abort();
          request.reject(reason);
          this.hashMap.delete(request.requestHash);
          return request;
        },
      );
      this.hashMap.set(request.requestHash, promise);
      return promise;
    }
    const promise = this.withAbortFunction<RQ, FetchControllerResult<RQ, RS>>(
      new Promise<FetchControllerResult<RQ, RS>>((res, rej) => {
        request.pending(res, rej);
        this.pendedRequests.push(request);
      }),
      () => {
        this.abortWithId(request.id)?.reject('Request aborted');
        this.hashMap.delete(request.requestHash);
        return request;
      },
    );
    this.hashMap.set(request.requestHash, promise);
    FCLogger.requestHasPendedLog(request);
    return promise;
  }

  private static processPendedRequests() {
    this._isPending = false;
    if (this.pendedRequests.length === 0) return;
    const curRequest: FCRequestInfo<any>[] = [];
    while (this.pendedRequests.length > 0) {
      curRequest.push(this.pendedRequests.shift() as FCRequestInfo);
      if (curRequest[curRequest.length - 1].initiatePending) {
        break;
      }
    }
    FCLogger.startPendedRequestLog();
    return Promise.all(
      curRequest.map((v) => this._internalRequest(v, true)),
    ).finally(() => {
      this.processPendedRequests();
    });
  }

  private static getRequestInfo<T>(
    props: InitiatorProperty | InitiatorPropertyWithBody<T>,
    method: Methods,
  ): FCRequestInfo<T> {
    const baseUrl = this._baseUrl;
    return new FCRequestInfo<T>({ baseUrl, ...props, method });
  }

  // Exported Requests

  static get<R>(url: string, props?: InitiatorPropertyWithoutUrl) {
    return this._internalRequest<FCRequestInfo<unknown>, R>(
      this.getRequestInfo({ url, ...props }, 'GET'),
    );
  }
  static post<T, R>(
    url: string,
    body?: T,
    props?: InitiatorPropertyWithoutUrl,
  ) {
    return this._internalRequest<T, R>(
      this.getRequestInfo<T>({ url, body, ...props }, 'POST'),
    );
  }
  static put<T, R>(url: string, body?: T, props?: InitiatorPropertyWithoutUrl) {
    return this._internalRequest<T, R>(
      this.getRequestInfo<T>({ url, body, ...props }, 'PUT'),
    );
  }
  static patch<T, R>(
    url: string,
    body?: T,
    props?: InitiatorPropertyWithoutUrl,
  ) {
    return this._internalRequest<T, R>(
      this.getRequestInfo<T>({ url, body, ...props }, 'PATCH'),
    );
  }
  static delete<T, R>(
    url: string,
    body?: T,
    props?: InitiatorPropertyWithoutUrl,
  ) {
    return this._internalRequest<T, R>(
      this.getRequestInfo<T>({ url, body, ...props }, 'DELETE'),
    );
  }
}
