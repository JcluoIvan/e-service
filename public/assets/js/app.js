const client = io('ws://127.0.0.1:3000/customer', {
    query: {
        token: 'abcdefg',
        name: '張先生',
    }
});

new Vue({
    el: '#app',
    data: {
        content: '',
        messages: [],
    },
    mounted() {




    },
    methods: {
        send () {

        }
    }
});
