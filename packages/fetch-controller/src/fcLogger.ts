import { FCRequestInfo } from './fcRequestInfo';

export const FCLogLevel = {
  ALL: 4,
  REQUEST: 3,
  PENDING: 2,
  ERROR: 1,
  NONE: 0,
} as const;

export type FCLogLevel = (typeof FCLogLevel)[keyof typeof FCLogLevel];

const FCLogType = {
  ERROR: 'ERROR',
  REQUEST: 'REQUEST',
  PENDING: 'PENDING',
};

type FCLogType = (typeof FCLogType)[keyof typeof FCLogType];

class PlainTextLog {
  readonly log: string;
  constructor(log: string) {
    this.log = log;
  }

  showLog() {
    console.log(this.log);
  }
}

class FCLog {
  readonly request: FCRequestInfo;
  readonly type: FCLogType;
  readonly reason: any;
  constructor(request: FCRequestInfo<any>, type: FCLogType, reason?: any) {
    this.request = request;
    this.type = type;
    this.reason = reason;
  }

  showLog() {
    switch (this.type) {
      case FCLogType.REQUEST:
        FCLogger.showInstantRequestLog(this.request);
        break;
      case FCLogType.PENDING:
        FCLogger.showInstantRequestLog(this.request);
      case FCLogType.ERROR:
        FCLogger.showErrorLog(this.request, this.reason);
      default:
        break;
    }
  }
}

export abstract class FCLogger {
  private static _logLevel: FCLogLevel = FCLogLevel.NONE;
  private static nestedLevel = 0;
  private static savedLog: (FCLog | PlainTextLog)[] = [];
  private static loggerSettings = {
    collaspeLogGroup: false,
  };

  static get logLevel() {
    return this._logLevel;
  }

  static setLogLevel(level: FCLogLevel) {
    this._logLevel = level;
  }

  private static setGroup(title = '', nestedLevel = 0) {
    while (this.nestedLevel > nestedLevel) {
      this.endGroup();
    }
    this.loggerSettings.collaspeLogGroup
      ? console.groupCollapsed(title)
      : console.group(title);
    this.nestedLevel++;
  }

  private static endGroup() {
    if (this.nestedLevel === 0) return;
    console.groupEnd();
    this.nestedLevel--;
  }

  private static log(message: any) {
    console.log(message);
  }

  private static error(message: any) {
    console.error(message);
  }

  private static logError() {
    return this._logLevel >= FCLogLevel.ERROR;
  }

  private static logPending() {
    return this._logLevel >= FCLogLevel.PENDING;
  }

  private static logRequest() {
    return this._logLevel >= FCLogLevel.PENDING;
  }

  private static requestLog(request: FCRequestInfo) {
    if (request.isPended) {
      if (!this.logPending()) return;
      this.pushLog(new FCLog(request, FCLogType.PENDING));
      return;
    } else {
      if (!this.logRequest()) return;
    }
    const logtime = new Date().getTime();
    this.setGroup(
      `${request.url} processed in ${logtime - request.timestamp}ms.`,
      request.isPended ? 1 : 0,
    );
    this.log(`Request Info : ${request.id}`);
    this.log(request);
    this.endGroup();
  }

  static showInstantRequestLog(request: FCRequestInfo<any>) {
    if (!this.logRequest()) return;
    this.requestLog(request);
  }
  static startPendedRequestLog() {
    if (!this.logPending()) return;
    this.setGroup('Processed Pending Requests');
  }
  static showPendedRequestLog(request: FCRequestInfo<any>) {
    if (!this.logPending()) return;
    this.requestLog(request);
  }
  static endPendedRequestLog() {
    if (!this.logPending()) return;
    this.showSavedLogs();
    this.endGroup();
  }

  static showErrorLog(request: FCRequestInfo<any>, reason?: any) {
    if (!this.logError()) return;
    this.setGroup(
      `An error occurred during process ${(request as FCRequestInfo<any>).url}`,
    );
    this.error(reason || 'Unknown Error');
    this.error('Request Info : ');
    this.error(request);
    this.endGroup();
  }

  static gotRequestInfoLog(request: FCRequestInfo<any>) {
    if (this.logRequest())
      this.pushLog(
        new PlainTextLog(
          `Got request ${request.url}. Request id: ${request.id}`,
        ),
      );
  }

  static gotDuplicatedRequestInfoLog(request: FCRequestInfo<any>) {
    if (this.logRequest()) {
      new PlainTextLog(
        `Got request ${request.url}, but exist same hash ${request.requestHash}. Request Ignored.`,
      ).showLog();
    }
  }

  static requestHasPendedLog(request: FCRequestInfo<any>) {
    if (this.logPending())
      new PlainTextLog(`Request id ${request.id} pended.`).showLog();
  }

  private static pushLog(log: FCLog | PlainTextLog) {
    this.savedLog.push(log);
  }

  private static showSavedLogs() {
    while (this.savedLog.length > 0) {
      this.savedLog.pop()?.showLog();
    }
  }
}
