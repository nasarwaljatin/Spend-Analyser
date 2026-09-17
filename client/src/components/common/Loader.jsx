export default function Loader({ size = 36 }) {
  return (
    <div className="loader">
      <div className="spinner" style={{ width: size, height: size }} />
    </div>
  );
}
