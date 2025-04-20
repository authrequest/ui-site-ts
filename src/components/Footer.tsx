import KoFiButton from './KofiButton';

interface FooterProps {
  currentTime: string;
}

function Footer({ currentTime }: FooterProps) {
  return (
    <div className="dock dock-bottom bg-base-200 p-4">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto relative pr-0">
        <div className="flex items-center gap-4">
          <span className="text-lg font-light tracking-wide text-base-content tabular-nums">
            {currentTime.split(' ')[0]}
          </span>
          <span className="text-xs font-medium text-base-content/80">
            {currentTime.split(' ')[1]} {currentTime.split(' ')[2]}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <KoFiButton />
        </div>
        <span className="text-sm text-base-content/70 absolute right-4">
          © 2025 SudoShoe, Inc All rights reserved.
        </span>
      </div>
    </div>
  );
}

export default Footer; 