try {
    Vue.config.errorHandler = (err) => {
        console.info('handle err');
        throw err;
    };

    new Vue({
        el: '#app',
        data: {
            target: '',
            messages: [],
            content: '',
            conn: null,
        },
        computed: {
            id() {
                return `ID-${new Date().getTime()}`;
            },
            peer() {
                return new Peer(this.id, {
                    port: 3000,
                    host: '127.0.0.1',
                    path: 'peer',
                });
            },
        },
        mounted() {
            console.info('mounted');
            // const ws = new WebSocket('ws://127.0.0.1:3000/echo');
            // ws.onmessage = (msg) => {
            //     console.info(msg);
            // };
            // ws.onopen = (event) => {
            //     ws.send('hello');
            // };

            this.peer.on('connection', (conn) => {
                this.onConnected(conn);
            });
            throw new Error('xxx');
        },
        methods: {
            connect() {
                console.info(this.target);
                const conn = this.peer.connect(this.target);
                conn.on('open', () => {
                    this.onConnected(conn);
                });
            },
            onConnected(conn) {
                this.conn = conn;
                conn.on('data', (data) => {
                    this.messages.push(data);
                });
            },
            send() {
                this.conn.send(this.content);
                this.messages.push(this.content);
                this.content = '';
            },
        },
    });
} catch (err) {
    console.error(err.stack);
}
