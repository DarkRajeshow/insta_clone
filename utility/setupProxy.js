import { createProxyMiddleware } from 'http-proxy-middleware';

export default function (app) {
    app.use(
        '/socket.io',
        createProxyMiddleware({
            target: 'https://insta-clone-v6nq.onrender.com',
            changeOrigin: true,
            ws: true,
        })
    );
};
