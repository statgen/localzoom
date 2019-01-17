// /* global $ */
import Vue from 'vue';

import * as Sentry from '@sentry/browser';

import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';

import App from './App.vue';

Sentry.init({
    dsn: process.env.VUE_APP_SENTRY_DSN,
    integrations: [new Sentry.Integrations.Vue({ Vue })],
});

new Vue({ render: h => h(App) })
    .$mount('#app');
