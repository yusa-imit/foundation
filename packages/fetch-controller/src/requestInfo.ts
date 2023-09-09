import { AxiosRequestConfig } from 'axios';
import { randomUUID } from './util/randomUUID';

export const Methods = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
} as const;

export type Methods = (typeof Methods)[keyof typeof Methods];

export const ResponseProcessMethod = {
  JSON: 'json',
  TEXT: 'text',
  BLOB: 'blob',
  STREAM: 'stream',
  ARRAYBUFFER: 'arraybuffer',
  DOCUMENT: 'document',
} as const;

export type ResponseProcessMethod =
  (typeof ResponseProcessMethod)[keyof typeof ResponseProcessMethod];

export type AcceptableAxiosConfig = Omit<
  AxiosRequestConfig,
  'url' | 'baseUrl' | 'method' | 'headers' | 'responseType'
>;

export interface RequestInfoOptions {
  pending?: boolean;
  result?: ResponseProcessMethod;
  axiosOptions?: AcceptableAxiosConfig;
}

export interface RequestInfoConstructorInfo<T = unknown> {
  baseUrl: string;
  url: string;
  method: Methods;
  body?: T;
  headers?: RequestInfoHeaders;
  options?: RequestInfoOptions;
}

export type RequestInfoHeaders = Record<string, string>;

export class RequestInfo<T = unknown> {
  readonly id: string;
  readonly baseUrl: string;
  readonly url: string;
  readonly method: Methods;
  readonly body?: T;
  readonly headers?: RequestInfoHeaders;
  readonly initiatePending: boolean;
  readonly abortController: AbortController;
  readonly resultProcessIn: ResponseProcessMethod;
  readonly axiosOptions: AcceptableAxiosConfig | null;
  readonly requestHash: string;
  private _isPended = false;
  private _sended = false;
  private _completed = false;
  private _aborted = false;

  private _resolve: (value: T | PromiseLike<T>) => void = () => {
    throw new Error(
      'Request was pended, but resolve function was not sended to request initiator.',
    );
  };
  private _reject: (reason?: any) => void = () => {
    throw new Error(
      'Request was pended, but resolve function was not sended to request initiator.',
    );
  };

  constructor(info: RequestInfoConstructorInfo<T>) {
    this.baseUrl = info.baseUrl;
    this.url = info.url;
    this.method = info.method;
    this.body = info.body;
    this.headers = info.headers;
    this.initiatePending = info.options?.pending || false;
    this.abortController = new AbortController();
    this.resultProcessIn = info.options?.result || ResponseProcessMethod.JSON;
    this.axiosOptions = info.options?.axiosOptions || null;
    this.id = randomUUID();
    this.requestHash = `${this.baseUrl}:${this.url}:${this.method}:${this.body}`;
  }

  get isPended() {
    return this._isPended;
  }

  get resolve() {
    return this._resolve;
  }

  get reject() {
    return this._reject;
  }

  get sended() {
    return this._sended;
  }

  get completetd() {
    return this._completed;
  }

  pending(
    resolve: (value: any | PromiseLike<any>) => void,
    reject: (reason?: any) => void,
  ) {
    this._isPended = true;
    this._resolve = resolve;
    this._reject = reject;
  }

  send() {
    this._sended = true;
  }

  abort() {
    this.abortController.abort();
    this._aborted = true;
    this.complete();
  }

  complete() {
    this._completed;
  }
}
