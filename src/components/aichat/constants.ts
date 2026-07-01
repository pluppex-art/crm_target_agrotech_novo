export const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🫢', '🤫', '🤥', '😶', '😐', '😑', '😬', '🫠', '🫨', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😮‍💨', '😵', '😵‍💫', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💅', '🤳', '💪', '❤️', '💖', '✨', '🔥', '🚀', '🎉', '✅', '❌', '⚠️', '💡',
];

export const WAHA_API = 'https://automacao-target-waha.vr4mar.easypanel.host';
export const WAHA_API_KEY = (import.meta.env.VITE_WAHA_API_KEY as string) ?? '';
export const WAHA_SESSION = (import.meta.env.VITE_WAHA_SESSION as string) ?? 'default';
export const WAHA_WS = `wss://automacao-target-waha.vr4mar.easypanel.host/ws?x-api-key=${WAHA_API_KEY}`;

export const CHAT_COLORS = [
  'from-emerald-500 to-teal-600', 'from-violet-500 to-purple-600',
  'from-pink-500 to-rose-600',    'from-amber-500 to-orange-600',
  'from-teal-500 to-emerald-600', 'from-blue-500 to-indigo-600',
  'from-cyan-500 to-blue-600',    'from-fuchsia-500 to-pink-600',
];

export const CHAT_FILTERS = ['Todas', 'Não lidas', 'WhatsApp', 'Instagram'] as const;
