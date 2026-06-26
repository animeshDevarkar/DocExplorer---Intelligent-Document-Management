import { Hono } from 'hono';

const app = new Hono();
const chatRouter = new Hono();

chatRouter.post('/', (c) => c.text('chat root'));
chatRouter.post('/test', (c) => c.text('chat test'));

app.route('/api/chat', chatRouter);

async function test() {
    let res = await app.request('/api/chat', { method: 'POST' });
    console.log('/api/chat ->', res.status, await res.text());

    res = await app.request('/api/chat/', { method: 'POST' });
    console.log('/api/chat/ ->', res.status, await res.text());
}
test();
