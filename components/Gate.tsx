export function Gate({ onConfirm }: { onConfirm: () => void }) {
  return (
    <main className="column">
      <h1 className="wordmark">Jesus</h1>
      <p>This is a place for adults.</p>
      <button className="send" type="button" onClick={onConfirm}>
        I am 18 or older
      </button>
    </main>
  );
}
