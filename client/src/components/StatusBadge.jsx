export default function StatusBadge({ status, syncState }) {
  return <span className={`badge ${syncState || status}`}>{syncState || status}</span>
}
