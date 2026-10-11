<script lang="ts">
  import { untrack } from 'svelte';
  import { ControlledBoard } from '@0disoft/banora-svelte';
  import type { Host } from './host.js';
  let { host }: { host: Host } = $props();
  let session = $state.raw(untrack(() => host.getState()));
  const options = $derived(host.options(session));
  $effect(() => {
    session = host.getState();
    return host.subscribe(() => {
      session = host.getState();
    });
  });
</script>

{#if session.mounted}
  <ControlledBoard {...options} onView={host.bindView} />
{/if}
