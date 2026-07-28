/** Decorative double-frame + corner squares — matches product card motif. */
export function ArtFrame() {
  return (
    <span className="art-frame" aria-hidden="true">
      <span className="art-corner art-corner-tl" />
      <span className="art-corner art-corner-tr" />
      <span className="art-corner art-corner-bl" />
      <span className="art-corner art-corner-br" />
    </span>
  );
}
