export async function fetchStream(response: Response) {
  if (!response.body) return null;
  const r = response.body.getReader();
  return await new Response(
    new ReadableStream({
      start: (controller) => {
        return pump();
        function pump(): any {
          return r.read().then(({ value, done }) => {
            if (done) {
              controller.close();
              return;
            }
            controller.enqueue(value);
            return pump();
          });
        }
      },
    }),
  ).blob();
}
