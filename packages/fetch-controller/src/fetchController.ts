import type { AxiosInstance, AxiosResponse } from 'axios';
import { Logger } from './logger';
import {
  Methods,
  RequestInfo,
  RequestInfoHeaders,
  RequestInfoOptions,
  ResponseProcessMethod,
} from './requestInfo';
import { getFetchProcessData } from './util/getFetchProcessData';
import { getAxiosProcessData } from './util/getAxiosProcessData';

interface InitiatorProperty {
  baseUrl?: string;
  url: string;
  headers?: RequestInfoHeaders;
  options?: RequestInfoOptions;
}

interface InitiatorPropertyWithBody<T> extends InitiatorProperty {
  body?: T;
}

export interface PromiseWithAbort<T = unknown, R = any> extends Promise<R> {
  abort: (reason?: any) => RequestInfo<T>;
}

export interface FetchControllerResult<T = any, Q = any> {
  data: T;
  status: number;
  requestInfo: RequestInfo<Q>;
}

export abstract class FetchController {
  private static _axiosInstance: AxiosInstance | undefined;
  private static _isPending = false;
  private static _baseUrl = '';
  private static hasmap = new Map<string, Promise<any>>();
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

  private static async fcFetch<T = unknown, R = unknown>(
    request: RequestInfo<T>,
  ): Promise<FetchControllerResult<R>> {
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
    request: RequestInfo<T>,
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
    request: RequestInfo<T>,
  ): Promise<FetchControllerResult<R>> {
    return getAxiosProcessData(await this.axiosMethodProcess(request), request);
  }

  private static withAbortFunction<T = unknown, R = unknown>(
    promise: Promise<R>,
    abortFunction: (reason?: any) => RequestInfo<T>,
  ): PromiseWithAbort<T, R> {
    return Object.assign(promise, { abort: abortFunction });
  }

  private static abortWithId(id: string) {
    const index = this.pendedRequests.findIndex((req) => req.id === id);
    if (index) {
      return this.pendedRequests.splice(index, 1)[0];
    }
  }

  private static _internalRequest<T = unknown, R = unknown>(
    request: RequestInfo<T>,
  ): Promise<FetchControllerResult<R>> {
    const check = this.hasmap.get(request.requestHash);
    if (check) return check;
    if (!this._isPending) {
      if (request.initiatePending) {
        this._isPending = true;
      }
      request.send();
      const promise = this.withAbortFunction<T, FetchControllerResult<R>>(
        this.isUsingAxios()
          ? this.fcAxios<T, R>(request)
              .then((value) => {
                request.complete();
                return value;
              })
              .finally(() => {
                this.processPendedRequests();
                this.hasmap.delete(request.requestHash);
              })
          : this.fcFetch<T, R>(request)
              .then((value) => {
                request.complete();
                return value;
              })
              .finally(() => {
                this.processPendedRequests();
                this.hasmap.delete(request.requestHash);
              }),
        () => {
          request.abortController.abort();
          this.hasmap.delete(request.requestHash);
          return request;
        },
      );
      this.hasmap.set(request.requestHash, promise);
      return promise;
    }
    const promise = this.withAbortFunction<T, FetchControllerResult<R>>(
      new Promise<FetchControllerResult<R>>((res, rej) => {
        request.pending(res, rej);
        this.pendedRequests.push(request);
      }),
      () => {
        this.abortWithId(request.id)?.reject('Request aborted');
        this.hasmap.delete(request.requestHash);
        return request;
      },
    );
    this.hasmap.set(request.requestHash, promise);
    return promise;
  }

  private static processPendedRequests() {
    this._isPending = false;
    if (this.pendedRequests.length === 0) return;
    const curRequest: RequestInfo<any>[] = [];
    while (this.pendedRequests.length > 0) {
      curRequest.push(this.pendedRequests.pop() as RequestInfo);
      if (curRequest[curRequest.length - 1].initiatePending) {
        break;
      }
    }
    Promise.all(curRequest.map((v) => this._internalRequest(v))).then(() => {
      this.processPendedRequests();
    });
  }

  private static getRequestInfo<T>(
    props: InitiatorProperty | InitiatorPropertyWithBody<T>,
    method: Methods,
  ): RequestInfo<T> {
    const baseUrl = this._baseUrl;
    return new RequestInfo<T>({ baseUrl, ...props, method });
  }
  static get<R>(props: InitiatorProperty) {
    return this._internalRequest<RequestInfo<unknown>, R>(
      this.getRequestInfo(props, 'GET'),
    );
  }
  static post<T, R>(props: InitiatorPropertyWithBody<T>) {
    return this._internalRequest<T, R>(this.getRequestInfo<T>(props, 'POST'));
  }
  static put<T, R>(props: InitiatorPropertyWithBody<T>) {
    return this._internalRequest<T, R>(this.getRequestInfo<T>(props, 'PUT'));
  }
  static patch<T, R>(props: InitiatorPropertyWithBody<T>) {
    return this._internalRequest<T, R>(this.getRequestInfo<T>(props, 'PATCH'));
  }
  static delete<T, R>(props: InitiatorPropertyWithBody<T>) {
    return this._internalRequest<T, R>(this.getRequestInfo<T>(props, 'DELETE'));
  }
}
