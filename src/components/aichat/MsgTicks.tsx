export function MsgTicks({ ack }: { ack?: number }) {
  if (ack === undefined || ack < 0) return null;
  const read = ack >= 3;
  const delivered = ack >= 2;
  const color = read ? '#53bdeb' : '#a0aec0';
  if (ack === 0) return (
    <svg className="inline-block" width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="#a0aec0" strokeWidth="1.5" />
      <path d="M8 5v3.5l2 1.5" stroke="#a0aec0" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
  return (
    <svg className="inline-block" width="16" height="11" viewBox="0 0 16 11" fill="none">
      {delivered && <path d="M1 5.5L4.5 9L11 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
      <path d={delivered ? 'M5 5.5L8.5 9L15 2' : 'M3 5.5L6.5 9L13 2'} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
