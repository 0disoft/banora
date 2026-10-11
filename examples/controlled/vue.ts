import { createApp, defineComponent, h, onBeforeUnmount, ref } from 'vue';
import { ControlledBoard } from '@0disoft/banora-vue';
import { createHost } from './host.js';
import { attachControls } from './controls.js';

const host = createHost();
const App = defineComponent({
  setup() {
    const session = ref(host.getState());
    const stop = host.subscribe(() => {
      session.value = host.getState();
    });
    onBeforeUnmount(stop);
    return () =>
      session.value.mounted
        ? h(ControlledBoard, { ...host.options(session.value), onView: host.bindView })
        : null;
  },
});
const stopControls = attachControls(host, 'Vue');
const app = createApp(App);
app.mount('#board-root');
window.addEventListener(
  'pagehide',
  () => {
    app.unmount();
    stopControls();
  },
  { once: true },
);
