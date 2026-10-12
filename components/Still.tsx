export function Still({ line }: { line: string }) {
  return (
    <div className="still">
      <div className="cross" aria-hidden="true" />
      <p>{line}</p>
    </div>
  );
}
