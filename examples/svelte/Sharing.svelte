<script lang="ts">
  import type { RecordController } from '@0disoft/banora';
  import { mountSharing } from '../sharing-controls.js';
  let { controller }: { controller: RecordController } = $props();
  let host = $state<HTMLDivElement>();
  $effect(() => {
    if (host) return mountSharing(host, controller);
  });
</script>

<div bind:this={host}></div>
