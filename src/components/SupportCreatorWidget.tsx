import React, { useState } from 'react';
import { 
  Heart, 
  QrCode, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  ExternalLink, 
  Edit3, 
  Coffee,
  Sparkles,
  X
} from 'lucide-react';
import { CreatorSupportConfig } from '../types';
import { playNavSound, playSuccessChime, playOpenSound } from '../utils/audio';

interface SupportCreatorWidgetProps {
  supportConfig: CreatorSupportConfig;
  onOpenDonationModal: (editMode?: boolean) => void;
  isOwnerLoggedIn?: boolean;
  isAdminActive?: boolean;
  onOpenOwnerLogin?: () => void;
}

export const SupportCreatorWidget: React.FC<SupportCreatorWidgetProps> = ({
  supportConfig,
  onOpenDonationModal,
  isOwnerLoggedIn = false,
  isAdminActive = false,
  onOpenOwnerLogin
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  if (isDismissed) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(supportConfig.accountNumber);
    setCopied(true);
    playSuccessChime();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenModal = () => {
    playOpenSound();
    onOpenDonationModal(false);
  };

  const handleOpenEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    playNavSound();
    onOpenDonationModal(true);
  };

  const hasCustomQr = Boolean(supportConfig.customQrImageUrl);

  return (
    <div className="fixed bottom-9 right-4 z-40 select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      {isExpanded ? (
        /* Expanded Floating Card */
        <div 
          onClick={handleOpenModal}
          className="group relative bg-white/95 dark:bg-[#222222]/95 backdrop-blur-md border border-neutral-200/90 dark:border-neutral-700/80 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-200 w-64 overflow-hidden cursor-pointer hover:border-rose-400/80 dark:hover:border-rose-500/80"
          title="Click to view full payment details and contribution options"
        >
          {/* Card Top Header */}
          <div className="px-3.5 py-2.5 bg-gradient-to-r from-rose-50/80 via-white to-neutral-50/80 dark:from-rose-950/30 dark:via-[#222222] dark:to-neutral-900/40 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-2xs">
                <Heart className="w-3 h-3 fill-white" />
              </span>
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                Support Creator
              </span>
              {hasCustomQr && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Custom QR active" />
              )}
            </div>

            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {/* Owner Edit Button */}
              {(isOwnerLoggedIn || isAdminActive) ? (
                <button
                  onClick={handleOpenEdit}
                  className="p-1 rounded-md text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Upload or change creator QR"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              ) : onOpenOwnerLogin ? (
                <button
                  onClick={() => {
                    playNavSound();
                    onOpenOwnerLogin();
                  }}
                  className="p-1 rounded-md text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Owner login to upload or change QR"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              ) : null}

              {/* Minimize to Pill Button */}
              <button
                onClick={() => {
                  playNavSound();
                  setIsExpanded(false);
                }}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title="Minimize widget"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* QR Code Presentation */}
          <div className="p-3 flex flex-col items-center">
            <div className="relative bg-white p-2 rounded-xl border border-neutral-200/80 shadow-xs flex items-center justify-center w-36 h-36 mb-2 group-hover:scale-102 transition-transform">
              {hasCustomQr ? (
                <img 
                  src={supportConfig.customQrImageUrl} 
                  alt="Creator Support QR" 
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                /* Crisp Vector Mini-QR */
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="100" height="100" fill="white" rx="4" />
                  {/* Top-Left Finder */}
                  <rect x="8" y="8" width="24" height="24" rx="3" fill="#0f172a" />
                  <rect x="12" y="12" width="16" height="16" rx="1.5" fill="white" />
                  <rect x="15" y="15" width="10" height="10" rx="1" fill="#0f172a" />
                  {/* Top-Right Finder */}
                  <rect x="68" y="8" width="24" height="24" rx="3" fill="#0f172a" />
                  <rect x="72" y="12" width="16" height="16" rx="1.5" fill="white" />
                  <rect x="75" y="15" width="10" height="10" rx="1" fill="#0f172a" />
                  {/* Bottom-Left Finder */}
                  <rect x="8" y="68" width="24" height="24" rx="3" fill="#0f172a" />
                  <rect x="12" y="72" width="16" height="16" rx="1.5" fill="white" />
                  <rect x="15" y="75" width="10" height="10" rx="1" fill="#0f172a" />
                  {/* Patterns */}
                  <g fill="#0f172a">
                    <rect x="36" y="16" width="5" height="5" />
                    <rect x="46" y="16" width="5" height="5" />
                    <rect x="56" y="16" width="5" height="5" />
                    <rect x="16" y="36" width="5" height="5" />
                    <rect x="16" y="46" width="5" height="5" />
                    <rect x="16" y="56" width="5" height="5" />
                    <rect x="36" y="36" width="6" height="6" />
                    <rect x="46" y="46" width="6" height="6" />
                    <rect x="58" y="36" width="6" height="6" />
                    <rect x="36" y="58" width="6" height="6" />
                    <rect x="48" y="68" width="6" height="6" />
                    <rect x="68" y="48" width="6" height="6" />
                    <rect x="78" y="60" width="6" height="6" />
                    <rect x="60" y="78" width="6" height="6" />
                    <rect x="78" y="78" width="6" height="6" />
                  </g>
                  {/* Heart badge */}
                  <circle cx="50" cy="50" r="9" fill="white" />
                  <circle cx="50" cy="50" r="7.5" fill="#f43f5e" />
                  <path d="M50 54s-2.5-1.8-3.5-3.2a2 2 0 0 1 3.2-2.4L50 49l.3-.6a2 2 0 0 1 3.2 2.4c-1 1.4-3.5 3.2-3.5 3.2z" fill="white" />
                </svg>
              )}
            </div>

            {/* Payee Info */}
            <div className="w-full text-center space-y-0.5 mb-2">
              <span className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate px-1">
                {supportConfig.holderName}
              </span>
              <span className="block text-[11px] text-neutral-500 dark:text-neutral-400 font-mono truncate px-1">
                {supportConfig.bankName}
              </span>
            </div>

            {/* Quick Action Button */}
            <div className="w-full flex items-center gap-1.5 pt-1 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={handleCopy}
                className="flex-1 py-1 px-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 flex items-center justify-center gap-1 transition-colors"
                title="Copy payment ID/Account"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-neutral-400" />
                    <span>Copy ID</span>
                  </>
                )}
              </button>

              <button
                onClick={handleOpenModal}
                className="flex-1 py-1 px-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-2xs transition-colors"
              >
                <span>Donate</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Minimized Floating Pill Button */
        <button
          onClick={() => {
            playNavSound();
            setIsExpanded(true);
          }}
          className="flex items-center gap-2 px-3 py-2 bg-white/95 dark:bg-[#222222]/95 backdrop-blur-md border border-neutral-200 dark:border-neutral-700 hover:border-rose-400 text-neutral-800 dark:text-neutral-100 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group cursor-pointer"
          title="Click to expand creator support QR widget"
        >
          <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform">
            <Heart className="w-3 h-3 fill-white" />
          </div>
          <span className="text-xs font-semibold">Support Creator</span>
          <div className="w-4 h-4 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500">
            <QrCode className="w-3 h-3" />
          </div>
          <ChevronUp className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200" />
        </button>
      )}
    </div>
  );
};
