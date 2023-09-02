import type { AxiosInstance } from 'axios';
import { Logger } from './logger';
import { Methods, RequestInfo, RequestInfoOptions } from './requestInfo';

interface InitiatorProperty {
  baseUrl?: string;
  url: string;
  headers?: Headers;
  options?: RequestInfoOptions;
}

interface InitiatorWithBodyProperty<T> extends InitiatorProperty {
  body?: T;
}

export abstract class FetchController {
  private static _axiosInstance: AxiosInstance | undefined;
  private static _isPending = false;
  private static _baseUrl = '';
  static pendedRequests: RequestInfo[] = [];

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

  private static fcFetch(request: RequestInfo) {}
  private static fcAxios(request: RequestInfo) {}

  private static _internalRequest(request: RequestInfo) {
    if (!this._isPending) {
      return this.isUsingAxios()
        ? this.fcAxios(request)
        : this.fcFetch(request);
    }

    const a = new Promise((res, rej) => {});
  }
  private static getRequestInfo(
    props: InitiatorProperty | InitiatorWithBodyProperty<any>,
    method: Methods,
  ) {
    const baseUrl = this._baseUrl;
    return new RequestInfo({ baseUrl, ...props, method });
  }
  static get(props: InitiatorProperty) {}
  static post<T>(props: InitiatorWithBodyProperty<T>) {}
  static put<T>(props: InitiatorWithBodyProperty<T>) {}
  static patch<T>(props: InitiatorWithBodyProperty<T>) {}
  static delete<T>(props: InitiatorWithBodyProperty<T>) {}
}
