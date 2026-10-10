<script lang="ts">
  import { onMount } from 'svelte';
  import { Board, Viewer, createRecordStore } from '@banora/svelte';
  import { RecordController } from '@banora/sdk';
  import type { BoardRotation, ControllerState } from '@banora/sdk';
  import sample from '../fixtures/study.sgf?raw';

  const records = [new RecordController({ sgf: sample }), new RecordController({ sgf: '(;SZ[13]GN[Second record];B[dd];W[jj])' })];
  let controller = $state.raw(records[0]!);
  const recordStore = $derived(createRecordStore(controller));
  let mounted = $state(true); let readOnly = $state(false); let flat = $state(false);
  let callbackB = $state(false); let events = $state(0); let last = $state('');
  let rotation = $state<BoardRotation>(0), flipX = $state(false);
  const transform = $derived({rotation,flipX});
  const reportA = (state: ControllerState) => { events++; last = `A:${state.position.moveNumber}`; };
  const reportB = (state: ControllerState) => { events++; last = `B:${state.position.moveNumber}`; };
  onMount(() => {
    const close = (event: PageTransitionEvent) => { if (!event.persisted) records.forEach(controller => controller.dispose()); };
    window.addEventListener('pagehide', close);
    return () => window.removeEventListener('pagehide', close);
  });
</script>

<main>
  <a href="../studio/">← Studio</a><h1>Banora in Svelte</h1>
  <p>Native Svelte components and a readable store share the SDK controller.</p>
  <p id="state" role="status">Move {$recordStore.position.moveNumber} · {$recordStore.position.width} × {$recordStore.position.height} · {$recordStore.dirty ? 'changed' : 'clean'}</p>
  <p id="events">Events {events} · {last}</p>
  <div class="controls">
    <button id="advance" onclick={() => controller.next()}>Advance controller</button>
    <button id="toggle" onclick={() => mounted = !mounted}>{mounted ? 'Unmount widgets' : 'Mount widgets'}</button>
    <button id="readonly" onclick={() => readOnly = !readOnly}>{readOnly ? 'Enable placement' : 'Read only'}</button>
    <button id="theme" onclick={() => flat = !flat}>Change theme</button>
    <button id="rotate" onclick={() => rotation = (rotation + 90) % 360 as BoardRotation}>Rotate board</button>
    <button id="reflect" onclick={() => flipX = !flipX}>Reflect board</button>
    <button id="callback" onclick={() => callbackB = !callbackB}>Change callback</button>
    <button id="swap" onclick={() => controller = controller === records[0] ? records[1]! : records[0]!}>Switch controller</button>
  </div>
  {#if mounted}
    <div class="boards">
      <section id="board-host"><Board {controller} {readOnly} {transform} theme={flat ? 'flat' : 'wood'} onStateChange={callbackB ? reportB : reportA}/></section>
      <section id="viewer-host"><Viewer {controller} editable={!readOnly} board={{ transform, theme: flat ? 'flat' : 'wood' }}/></section>
    </div>
    <section id="owned-board" style="max-width:350px"><h2>Optional owned controller</h2><Board {readOnly} {transform} theme={flat ? 'flat' : 'wood'}/></section>
  {:else}<p>Widgets unmounted. The controller remains active.</p>{/if}
</main>
