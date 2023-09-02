import { randomUUID } from './util/randomUUID';

export const Methods = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
};

export type Methods = (typeof Methods)[keyof typeof Methods];

export const ResponseProcessMethod = {
  JSON: 'JSON',
  TEXT: 'TEXT',
  BLOB: 'BLOB',
};

export type ResponseProcessMethod =
  (typeof ResponseProcessMethod)[keyof typeof ResponseProcessMethod];

export interface RequestInfoOptions {
  pending?: boolean;
  usingAbort?: boolean;
  result?: ResponseProcessMethod;
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
  readonly abortController?: AbortController;
  private _isPended = false;

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
    this.abortController = info.options?.usingAbort
      ? new AbortController()
      : undefined;
    this.id = randomUUID();
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

  pending(
    resolve: (value: T | PromiseLike<T>) => void,
    reject: (reason?: any) => void,
  ) {
    this._isPended = true;
    this._resolve = resolve;
    this._reject = reject;
  }
}
