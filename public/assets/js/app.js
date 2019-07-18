const client = io('ws://127.0.0.1:3000/customer-abcd', {
    query: {
        token: 'abcdefg',
        name: '張先生',
    },
});

Vue.filter('dt', (value) => {
    console.info(value);
    return value ? moment(value).format('YYYY-MM-DD HH:mm:ss') : '';
});

new Vue({
    el: '#app',
    data: {
        content: '',
        messages: [],
    },
    mounted() {},
    methods: {
        send() {
            const content = this.content;
            this.content = '';
            client.emit(
                'send',
                {
                    content,
                    type: 'text/plain',
                },
                (time) => {
                    // console.info(res);
                    this.messages.push({
                        content,
                        time: time,
                    });
                },
            );
        },
        unbind () {
            client.emit('unbind');
        }
    },
});
