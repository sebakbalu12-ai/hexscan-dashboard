import { Menu } from '../ui/Controls';
import Icon from '../ui/Icon';
import type { IconName } from '../ui/Icon';
import type { Pin } from '../../lib/types';

export interface PinAction {
  label: string;
  icon?: IconName;
  tone?: 'default' | 'danger';
  separator?: boolean;
  /** Optional: omitting it renders the item as a no-op. */
  onSelect?: () => void;
}

/**
 * The “…” menu from the reference: View Results, Edit, Manage Access, Delete and
 * Copy Pin. Kept as a controlled component so both the table and the detail page
 * can reuse it.
 */
export function PinActionsMenu({ pin, actions, align = 'right' }: { pin: Pin; actions: PinAction[]; align?: 'left' | 'right' }) {
  const visible = actions.filter((action) => action.onSelect);
  if (!visible.length) return null;

  return (
    // stopPropagation: the row itself is clickable (opens the report), but the
    // menu trigger and its items must not bubble up to that handler.
    <div onClick={(event) => event.stopPropagation()}>
      <Menu
        align={align}
        width={196}
        items={visible.map((action) => ({
          label: action.label,
          icon: action.icon,
          tone: action.tone,
          // A divider sits above the destructive entry, like the reference menu.
          separator: action.separator ?? action.tone === 'danger',
          onSelect: action.onSelect,
        }))}
        trigger={({ toggle }) => (
          <button
            type="button"
            onClick={toggle}
            aria-label={`Actions for pin ${pin.code}`}
            className="rounded-md border border-transparent p-1.5 text-mist-400 transition-colors hover:border-line hover:bg-white/[0.05] hover:text-mist-100"
          >
            <Icon name="more" size={16} />
          </button>
        )}
      />
    </div>
  );
}

export default PinActionsMenu;
