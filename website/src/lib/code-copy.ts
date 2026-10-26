import { mount, unmount, tick } from 'svelte';
import CodeCopy from './CodeCopy.svelte';
export function codeCopy(node: HTMLElement, html: string) {
  let mounted: ReturnType<typeof mount>[] = [];
  let disposed = false;
  let generation = 0;
  async function update(value: string) {
    const current = ++generation;
    for (const instance of mounted) void unmount(instance);
    mounted = [];
    await tick();
    if (disposed || current !== generation) return;
    for (const pre of node.querySelectorAll('pre')) {
      const toolbar = document.createElement('div');
      toolbar.className = 'flex justify-end mb-2';
      pre.before(toolbar);
      mounted.push(
        mount(CodeCopy, {
          target: toolbar,
          props: { text: pre.textContent || '' },
        }),
      );
    }
  }
  void update(html);
  return {
    update,
    destroy() {
      disposed = true;
      generation++;
      for (const instance of mounted) void unmount(instance);
    },
  };
}
