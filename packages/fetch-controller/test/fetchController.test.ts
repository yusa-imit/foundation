import { FetchController } from '../src';

describe('Test FetchController Basics', () => {
  test('get', () => {
    const get = FetchController.get('/api');
    expect(get).toBeInstanceOf(Promise);
    expect(get).toHaveProperty('abort');
  });
});
