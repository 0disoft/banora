import { mount, unmount } from 'svelte';
import SvelteConsumer from './SvelteConsumer.svelte';
import { createHost } from './host.js';
import { attachControls } from './controls.js';

const host = createHost(),
  stopControls = attachControls(host, 'Svelte');
const app = mount(SvelteConsumer, {
  target: document.querySelector('#board-root')!,
  props: { host },
});
window.addEventListener(
  'pagehide',
  () => {
    void unmount(app);
    stopControls();
  },
  { once: true },
);
