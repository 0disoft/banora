import menu from '@phosphor-icons/core/assets/regular/dots-three.svg?url';
import undo from '@phosphor-icons/core/assets/regular/arrow-counter-clockwise.svg?url';
import redo from '@phosphor-icons/core/assets/regular/arrow-clockwise.svg?url';
import first from '@phosphor-icons/core/assets/regular/skip-back.svg?url';
import previous from '@phosphor-icons/core/assets/regular/caret-left.svg?url';
import next from '@phosphor-icons/core/assets/regular/caret-right.svg?url';
import last from '@phosphor-icons/core/assets/regular/skip-forward.svg?url';
import play from '@phosphor-icons/core/assets/fill/play-fill.svg?url';
import pause from '@phosphor-icons/core/assets/fill/pause-fill.svg?url';
import open from '@phosphor-icons/core/assets/regular/folder-simple.svg?url';
import save from '@phosphor-icons/core/assets/regular/floppy-disk.svg?url';
import back from '@phosphor-icons/core/assets/regular/arrow-left.svg?url';
import close from '@phosphor-icons/core/assets/regular/x.svg?url';
import comment from '@phosphor-icons/core/assets/regular/chat-text.svg?url';
import sound from '@phosphor-icons/core/assets/regular/speaker-high.svg?url';
import muted from '@phosphor-icons/core/assets/regular/speaker-slash.svg?url';
import fullscreen from '@phosphor-icons/core/assets/regular/arrows-out.svg?url';
import restore from '@phosphor-icons/core/assets/regular/arrows-in.svg?url';

export function applyStudioIcons(): void {
  for (const [name, url] of Object.entries({
    menu,
    undo,
    redo,
    first,
    previous,
    next,
    last,
    play,
    pause,
    open,
    save,
    back,
    close,
    comment,
    sound,
    muted,
    fullscreen,
    restore,
  }))
    document.documentElement.style.setProperty(`--icon-${name}`, `url("${url}")`);
}
