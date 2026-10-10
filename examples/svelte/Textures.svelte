<script lang="ts">
  import { untrack } from 'svelte';
  import type { Color, StoneTexture, StoneTextures } from '@banora/sdk';
  import { mountTextureControls } from '../texture-controls.js';
  let {
    textures,
    onChange,
  }: {
    textures: StoneTextures | null;
    onChange: (color: Color, texture: StoneTexture | null) => void;
  } = $props();
  let host = $state<HTMLDivElement>();
  $effect(() => {
    if (host)
      return mountTextureControls(host, {
        initial: untrack(() => textures),
        onChange: (color, texture) => onChange(color, texture),
      });
  });
</script>

<div bind:this={host}></div>
