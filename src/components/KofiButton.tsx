export default function KoFiButton() {
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <a
        href="https://ko-fi.com/x_auth_req"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center px-4 py-2 bg-[#29abe0] text-white rounded-lg shadow-lg hover:opacity-90 transition-opacity"
      >
        <img
          src="https://ko-fi.com/img/cup-border.png"
          alt="Ko-fi"
          className="h-5 w-5 mr-2"
        />
        <span className="font-semibold">Support me</span>
      </a>
    </div>
  );
}