import { FCRequestInfo, Methods } from '../src';

describe('fc request info : self', () => {
  const rq1 = { url: '/', method: Methods.GET, baseUrl: '/' };
  const rq2 = { baseUrl: '/', url: '/', method: Methods.GET };
  const rq3 = { url: '/', method: Methods.PUT, baseUrl: '/' };

  const info1 = new FCRequestInfo(rq1);
  const info2 = new FCRequestInfo(rq2);
  const info3 = new FCRequestInfo(rq3);

  it('request must have different id', () => {
    expect(info1.id).not.toEqual(info2.id);
  });

  it('request hash must be different on different request', () => {
    expect(info1.requestHash).not.toEqual(info3.requestHash);
  });

  it('request hash is must not be different on same unordered request', () => {
    expect(info1.requestHash).toEqual(info2.requestHash);
  });
});
